-- =====================================================================
-- Off-Phone Rewards — schema.sql (đầy đủ, scale-ready)
-- Nguồn: docs/specs.md §1 (6 bảng) + §2 (function claim_voucher).
-- Apply: Supabase Dashboard → SQL Editor (chạy 1 lần). Idempotent (re-run an toàn).
--
-- ⚠️ RLS: KHÔNG bật ở MVP (specs.md §5). Bật RLS mà thiếu policy anon-insert sẽ
--    chặn INSERT focus_sessions → app chết. Defer sang Fast-follow TF-4.
--    Server Actions dùng service_role (bypass RLS) nên user flow vẫn chạy.
-- =====================================================================

-- pgcrypto: cần cho crypt()/gen_salt() ở seed.sql (bcrypt answer_hash).
-- gen_random_uuid() là core từ PG13+ (không cần extension).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- ENUM types (idempotent qua DO block — CREATE TYPE không có IF NOT EXISTS)
-- ---------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('RUNNING','COMPLETED','FAILED','EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE voucher_status AS ENUM ('AVAILABLE','RESERVED','REDEEMED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 1.1 venues  🟢
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venues (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255)     NOT NULL,
    latitude          DOUBLE PRECISION NOT NULL,
    longitude         DOUBLE PRECISION NOT NULL,
    radius_meters     SMALLINT         NOT NULL DEFAULT 20,
    timezone          TEXT             NOT NULL DEFAULT 'Asia/Ho_Chi_Minh', -- weekday quest rotation
    sub_quest_config  JSONB            NOT NULL DEFAULT '[]'::jsonb,        -- Blind Box (specs §3)
    branding          JSONB            NOT NULL DEFAULT '{}'::jsonb,        -- 🟢 màu + tên challenge
    pos_api_key_hash  VARCHAR(255),                                        -- 🔵 V2 (Chain POS API)
    active            BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 1.2 focus_sessions  🟢
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS focus_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id            UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    guest_token         TEXT NOT NULL,
    device_fingerprint  VARCHAR(64),                        -- 🟡 cột sẵn, MVP chưa enforce
    start_time          TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- ← SOURCE OF TRUTH
    completed_at        TIMESTAMPTZ,
    status              session_status NOT NULL DEFAULT 'RUNNING',
    sub_quest_passed    BOOLEAN NOT NULL DEFAULT FALSE,     -- 🟢 gate claim
    sub_quest_response  TEXT,
    infraction_count    SMALLINT NOT NULL DEFAULT 0,
    ip_address          INET,                               -- nullable (proxy edge case)
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IDEMPOTENCY Ở TẦNG DB: tối đa 1 phiên RUNNING / (token, venue). Chặn race 2 lần START.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_running_session
    ON focus_sessions(guest_token, venue_id)
    WHERE status = 'RUNNING';

-- ---------------------------------------------------------------------
-- 1.3 vouchers  🟢
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vouchers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    session_id  UUID REFERENCES focus_sessions(id) ON DELETE SET NULL,
    code        VARCHAR(50) NOT NULL,
    status      voucher_status NOT NULL DEFAULT 'AVAILABLE',
    assigned_at TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, code)            -- code unique theo venue (đa-tenant)
);

-- CRITICAL: 1 voucher / session — giết bug "cấp 2 voucher cho 1 session".
CREATE UNIQUE INDEX IF NOT EXISTS uniq_voucher_per_session
    ON vouchers(session_id) WHERE session_id IS NOT NULL;

-- POS lookup
CREATE INDEX IF NOT EXISTS idx_vouchers_pos ON vouchers(venue_id, code);
-- Quét pool khi claim
CREATE INDEX IF NOT EXISTS idx_vouchers_available ON vouchers(venue_id) WHERE status = 'AVAILABLE';

-- ---------------------------------------------------------------------
-- 1.4 bypass_otps  🟡 (schema sẵn, MVP dùng static CASHIER_BYPASS_CODE)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bypass_otps (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id      UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    session_id    UUID NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
    otp_code      VARCHAR(6) NOT NULL,
    created_by_ip INET,
    used_at       TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bypass_otp_lookup
    ON bypass_otps(otp_code, session_id) WHERE used_at IS NULL;

-- ---------------------------------------------------------------------
-- 1.5 device_daily_limits  🟡 (rate-limit 3 lớp)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_daily_limits (
    fingerprint        VARCHAR(64) NOT NULL,
    venue_id           UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    date               DATE NOT NULL DEFAULT CURRENT_DATE,
    successful_claims  SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (fingerprint, venue_id, date)
);

-- ---------------------------------------------------------------------
-- 1.6 venue_admin_users  🔵 V2 (Admin UI + RLS)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venue_admin_users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id     UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    email        VARCHAR(255) NOT NULL UNIQUE,
    supabase_uid UUID NOT NULL UNIQUE,
    role         VARCHAR(20) NOT NULL DEFAULT 'owner', -- owner | staff
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 2. Atomic claim function (pooler-safe)  🟢  — specs.md §2
-- Toàn bộ check thời gian + idempotency + cấp voucher gói trong 1 function,
-- gọi 1 lần từ Server Action (an toàn với transaction-mode pooler).
-- =====================================================================
CREATE OR REPLACE FUNCTION claim_voucher(p_session_id UUID, p_venue_id UUID)
RETURNS TABLE(out_code VARCHAR, out_error TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    v_session  focus_sessions%ROWTYPE;
    v_existing VARCHAR;
    v_code     VARCHAR;
BEGIN
    -- Khoá phiên → serialize claim đồng thời của cùng session
    SELECT * INTO v_session FROM focus_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::VARCHAR, 'SESSION_NOT_FOUND'; RETURN;
    END IF;

    -- Idempotency: đã có voucher → trả lại cái cũ
    SELECT code INTO v_existing FROM vouchers WHERE session_id = p_session_id LIMIT 1;
    IF v_existing IS NOT NULL THEN
        RETURN QUERY SELECT v_existing, NULL::TEXT; RETURN;
    END IF;

    IF v_session.status <> 'RUNNING' THEN
        RETURN QUERY SELECT NULL::VARCHAR, 'SESSION_NOT_RUNNING'; RETURN;
    END IF;
    IF NOT v_session.sub_quest_passed THEN
        RETURN QUERY SELECT NULL::VARCHAR, 'QUEST_NOT_PASSED'; RETURN;
    END IF;

    -- Khung Giờ Vàng 45–48' — SERVER TIME
    IF NOW() NOT BETWEEN v_session.start_time + INTERVAL '45 minutes'
                     AND v_session.start_time + INTERVAL '48 minutes' THEN
        UPDATE focus_sessions SET status = 'FAILED'
            WHERE id = p_session_id AND status = 'RUNNING';
        RETURN QUERY SELECT NULL::VARCHAR, 'OUTSIDE_WINDOW'; RETURN;
    END IF;

    -- Cấp nguyên tử: 1 session chỉ lấy 1 voucher (uniq_voucher_per_session bảo chứng)
    UPDATE vouchers
       SET status = 'RESERVED', session_id = p_session_id,
           assigned_at = NOW(), expires_at = NOW() + INTERVAL '3 days'
     WHERE id = (
         SELECT id FROM vouchers
          WHERE venue_id = p_venue_id AND status = 'AVAILABLE'
          ORDER BY created_at
          LIMIT 1 FOR UPDATE SKIP LOCKED
     )
    RETURNING code INTO v_code;

    IF v_code IS NULL THEN
        RETURN QUERY SELECT NULL::VARCHAR, 'POOL_EMPTY'; RETURN;
    END IF;

    UPDATE focus_sessions SET status = 'COMPLETED', completed_at = NOW()
        WHERE id = p_session_id;
    RETURN QUERY SELECT v_code, NULL::TEXT;
END $$;
