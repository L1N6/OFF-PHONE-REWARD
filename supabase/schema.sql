-- =====================================================================
-- Off-Phone Rewards — schema.sql (đầy đủ, scale-ready)
-- Nguồn: docs/specs.md §1 (6 bảng) + §2 (function claim_voucher).
-- Apply: Supabase Dashboard → SQL Editor (chạy 1 lần). Idempotent (re-run an toàn).
--
-- RLS: Bật từ TF-4 (specs.md §5) — xem cuối file. Server Actions dùng service_role
--    (bypass RLS hoàn toàn) nên user flow vẫn chạy ngay cả khi RLS enabled.
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
-- 1.6 venue_admin_users  🟡 Fast-follow (TV2-1: Admin Auth + invite)
-- TV2-1: composite UNIQUE per venue; supabase_uid nullable (invite flow:
--   pre-create row trước khi user accept → link uid ở auth callback).
-- role: owner (đăng ký tự do, sở hữu nhiều venue) | manager (được invite).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venue_admin_users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id     UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    email        VARCHAR(255) NOT NULL,
    supabase_uid UUID,
    role         VARCHAR(20) NOT NULL DEFAULT 'owner', -- owner | manager
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_admin_venue_uid   UNIQUE (venue_id, supabase_uid),
    CONSTRAINT uq_admin_venue_email UNIQUE (venue_id, email)
);
-- Migration idempotent cho DB đã tồn tại (old individual UNIQUE → composite per-venue).
ALTER TABLE venue_admin_users DROP CONSTRAINT IF EXISTS venue_admin_users_email_key;
ALTER TABLE venue_admin_users DROP CONSTRAINT IF EXISTS venue_admin_users_supabase_uid_key;
DO $$ BEGIN ALTER TABLE venue_admin_users ALTER COLUMN supabase_uid DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE venue_admin_users
    ADD CONSTRAINT uq_admin_venue_uid UNIQUE (venue_id, supabase_uid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE venue_admin_users
    ADD CONSTRAINT uq_admin_venue_email UNIQUE (venue_id, email);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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

-- =====================================================================
-- create_session(p_guest_token, p_venue_id)  🟢  — specs.md §4 Module 1
-- Gói rate-limit + idempotency + INSERT vào 1 function (atomic, pooler-safe).
--   • Rate-limit: 1 phiên COMPLETED / token / venue / NGÀY ĐỊA PHƯƠNG (theo venue.timezone).
--     Dùng AT TIME ZONE (KHÔNG CURRENT_DATE/UTC) để mốc ngày đúng giờ quán (Invariant #1).
--   • Idempotency (Invariant #6): có phiên RUNNING → resume; race 2 INSERT đồng thời →
--     uniq_running_session chặn, request thua bắt unique_violation → resume phiên vừa tạo.
--   • start_time = DEFAULT NOW() (server time). Validate UUID guest_token làm ở Server Action.
-- =====================================================================
CREATE OR REPLACE FUNCTION create_session(p_guest_token TEXT, p_venue_id UUID)
RETURNS TABLE(out_session_id UUID, out_start_time TIMESTAMPTZ, out_resumed BOOLEAN, out_error TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    v_tz       TEXT;
    v_existing focus_sessions%ROWTYPE;
    v_id       UUID;
    v_start    TIMESTAMPTZ;
BEGIN
    -- Venue tồn tại? (lấy timezone cho mốc "hôm nay" địa phương)
    SELECT timezone INTO v_tz FROM venues WHERE id = p_venue_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TIMESTAMPTZ, FALSE, 'VENUE_NOT_FOUND'; RETURN;
    END IF;

    -- Resume: đã có phiên RUNNING (token, venue) → trả lại (ưu tiên hơn rate-limit:
    -- phiên đang dở chưa nhận thưởng nên không tính vào hạn mức ngày).
    SELECT * INTO v_existing FROM focus_sessions
        WHERE guest_token = p_guest_token AND venue_id = p_venue_id AND status = 'RUNNING'
        LIMIT 1;
    IF FOUND THEN
        RETURN QUERY SELECT v_existing.id, v_existing.start_time, TRUE, NULL::TEXT; RETURN;
    END IF;

    -- Rate-limit: đã COMPLETED 1 phiên trong NGÀY ĐỊA PHƯƠNG hôm nay → chặn tạo mới.
    IF EXISTS (
        SELECT 1 FROM focus_sessions
        WHERE guest_token = p_guest_token AND venue_id = p_venue_id AND status = 'COMPLETED'
          AND (completed_at AT TIME ZONE v_tz)::date = (NOW() AT TIME ZONE v_tz)::date
    ) THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TIMESTAMPTZ, FALSE, 'RATE_LIMITED'; RETURN;
    END IF;

    -- Tạo phiên mới; uniq_running_session là chốt chống race cuối cùng.
    BEGIN
        INSERT INTO focus_sessions (guest_token, venue_id)
        VALUES (p_guest_token, p_venue_id)
        RETURNING id, start_time INTO v_id, v_start;
        RETURN QUERY SELECT v_id, v_start, FALSE, NULL::TEXT; RETURN;
    EXCEPTION WHEN unique_violation THEN
        -- Request thua race: phiên RUNNING đã được request kia tạo → resume.
        SELECT * INTO v_existing FROM focus_sessions
            WHERE guest_token = p_guest_token AND venue_id = p_venue_id AND status = 'RUNNING'
            LIMIT 1;
        RETURN QUERY SELECT v_existing.id, v_existing.start_time, TRUE, NULL::TEXT; RETURN;
    END;
END $$;

-- =====================================================================
-- get_session_status(p_session_id)  🟢  — specs.md §4 Module 2
-- Server timer & phase machine.
--   • Δt = EXTRACT(EPOCH FROM (NOW() - start_time)) tính phía Postgres (Invariant #1
--     SERVER TIME — KHÔNG Date.now() ở Node). FLOOR → giây nguyên.
--   • Lazy-expiry: phiên RUNNING quá 48' (>2880s) → status='EXPIRED'. Gộp đọc-Δt +
--     expiry trong 1 function (atomic, pooler-safe — Invariant #2). UPDATE có
--     WHERE status='RUNNING' nên idempotent dưới poll đồng thời (Invariant #6).
--   • Trả RAW facts (Δt + status sau expiry + sub_quest_passed); map phase + claim-window
--     để Node tính (pure, lib/sessionStatus.ts — test offline mọi biên).
--   • 0 dòng nếu session không tồn tại → Route trả 404.
-- =====================================================================
CREATE OR REPLACE FUNCTION get_session_status(p_session_id UUID)
RETURNS TABLE(out_delta_seconds INTEGER, out_status session_status, out_sub_quest_passed BOOLEAN)
LANGUAGE plpgsql AS $$
DECLARE
    v_session focus_sessions%ROWTYPE;
    v_delta   INTEGER;
BEGIN
    SELECT * INTO v_session FROM focus_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RETURN; -- 0 dòng → 404 ở route
    END IF;

    -- Δt nguyên giây, phía server.
    v_delta := FLOOR(EXTRACT(EPOCH FROM (NOW() - v_session.start_time)))::INTEGER;

    -- Lazy expiry: chỉ phiên RUNNING quá 48' mới chuyển EXPIRED (COMPLETED/FAILED giữ nguyên).

    IF v_session.status = 'RUNNING' AND v_delta > 2880 THEN
        UPDATE focus_sessions SET status = 'EXPIRED'
            WHERE id = p_session_id AND status = 'RUNNING';
        v_session.status := 'EXPIRED';
    END IF;

    RETURN QUERY SELECT v_delta, v_session.status, v_session.sub_quest_passed;
END $$;

-- =====================================================================
-- validate_sub_quest(p_session_id, p_venue_id, p_answer, p_confirmed)  🟢
--   specs.md §3 — Blind Box (MVP: code_entry + physical_action).
--   • Weekday theo GIỜ QUÁN: EXTRACT(DOW FROM NOW() AT TIME ZONE venue.timezone)
--     (Invariant #1 — KHÔNG new Date().getDay()). DOW: 0=CN..6=T7, khớp active_weekdays.
--   • Chọn quest theo INPUT: có p_answer → code_entry; p_confirmed → physical_action.
--   • code_entry verify bằng pgcrypto: crypt(lower(trim(answer)), hash)=hash (bcrypt $2a$,
--     KHÔNG cần dep node; KHÔNG trả đáp án về client). physical_action = honor (confirmed).
--   • Valid → UPDATE sub_quest_passed=TRUE + sub_quest_response. Atomic (Invariant #2).
--   • Đã pass → idempotent trả valid. Trả {out_valid, out_error}.
--   SET search_path: crypt() ở public (local) / extensions (Supabase) — 1 def chạy cả hai.
-- =====================================================================
CREATE OR REPLACE FUNCTION validate_sub_quest(
    p_session_id UUID,
    p_venue_id   UUID,
    p_answer     TEXT    DEFAULT NULL,
    p_confirmed  BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(out_valid BOOLEAN, out_error TEXT)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_session focus_sessions%ROWTYPE;
    v_tz      TEXT;
    v_config  JSONB;
    v_dow     INT;
    v_type    TEXT;
    v_quest   JSONB;
    v_hash    TEXT;
    v_ok      BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_session FROM focus_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'SESSION_NOT_FOUND'; RETURN;
    END IF;

    -- Đã hoàn thành quest → idempotent (không cho làm lại, không lỗi).
    IF v_session.sub_quest_passed THEN
        RETURN QUERY SELECT TRUE, NULL::TEXT; RETURN;
    END IF;

    IF v_session.status <> 'RUNNING' THEN
        RETURN QUERY SELECT FALSE, 'SESSION_NOT_RUNNING'; RETURN;
    END IF;

    SELECT timezone, sub_quest_config INTO v_tz, v_config
        FROM venues WHERE id = p_venue_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'VENUE_NOT_FOUND'; RETURN;
    END IF;

    -- Weekday địa phương (Invariant #1).
    v_dow := EXTRACT(DOW FROM (NOW() AT TIME ZONE v_tz))::INT;

    -- Loại quest suy từ input.
    IF p_answer IS NOT NULL THEN
        v_type := 'code_entry';
    ELSIF p_confirmed THEN
        v_type := 'physical_action';
    ELSE
        RETURN QUERY SELECT FALSE, 'NO_INPUT'; RETURN;
    END IF;

    -- Quest đầu tiên đúng loại + active hôm nay.
    SELECT q INTO v_quest
    FROM jsonb_array_elements(COALESCE(v_config->'quests', '[]'::jsonb)) AS q
    WHERE q->>'type' = v_type
      AND (q->'active_weekdays') @> to_jsonb(v_dow)
    LIMIT 1;

    IF v_quest IS NULL THEN
        RETURN QUERY SELECT FALSE, 'NO_QUEST_TODAY'; RETURN;
    END IF;

    IF v_type = 'code_entry' THEN
        v_hash := v_quest->'content'->>'answer_hash';
        IF v_hash IS NULL THEN
            RETURN QUERY SELECT FALSE, 'QUEST_MISCONFIGURED'; RETURN;
        END IF;
        -- bcrypt verify: chuẩn hoá trim+lower trước khi so (khớp cách hash khi seed).
        v_ok := crypt(lower(btrim(p_answer)), v_hash) = v_hash;
    ELSE -- physical_action
        v_ok := p_confirmed;
    END IF;

    IF NOT v_ok THEN
        RETURN QUERY SELECT FALSE, 'WRONG_ANSWER'; RETURN;
    END IF;

    UPDATE focus_sessions
       SET sub_quest_passed   = TRUE,
           sub_quest_response  = COALESCE(p_answer, 'confirmed')
     WHERE id = p_session_id;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END $$;

-- =====================================================================
-- get_active_quests(p_venue_id)  🟢  — specs.md §3 (hiển thị Blind Box T2-3)
--   Trả quest active HÔM NAY (weekday `EXTRACT(DOW FROM NOW() AT TIME ZONE venue.timezone)`
--   — Invariant #1) dưới dạng JSONB array, ĐÃ STRIP `answer_hash` (đáp án KHÔNG rời server,
--   chỉ field hiển thị: id/type/title/description/hint/confirm_button). Venue không có → [].
--   Giữ thứ tự quest trong config (WITH ORDINALITY).
-- =====================================================================
CREATE OR REPLACE FUNCTION get_active_quests(p_venue_id UUID)
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_tz     TEXT;
    v_config JSONB;
    v_dow    INT;
    v_result JSONB;
BEGIN
    SELECT timezone, sub_quest_config INTO v_tz, v_config
        FROM venues WHERE id = p_venue_id;
    IF NOT FOUND THEN
        RETURN '[]'::jsonb;
    END IF;

    v_dow := EXTRACT(DOW FROM (NOW() AT TIME ZONE v_tz))::INT;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',             q->>'id',
            'type',           q->>'type',
            'title',          q->'content'->>'title',
            'description',    q->'content'->>'description',
            'hint',           q->'content'->>'hint',
            'confirm_button', q->'content'->>'confirm_button'
        ) ORDER BY ord
    ), '[]'::jsonb) INTO v_result
    FROM jsonb_array_elements(COALESCE(v_config->'quests', '[]'::jsonb))
         WITH ORDINALITY AS t(q, ord)
    WHERE (q->'active_weekdays') @> to_jsonb(v_dow);

    RETURN v_result;
END $$;

-- =====================================================================
-- log_infraction(p_session_id)  🟢  — specs.md §4 Module 2 (visibilitychange)
--   INCREMENT infraction_count nguyên tử (UPDATE col=col+1 dưới row-lock — Invariant #2,
--   không lost-update khi rời/về màn hình nhiều lần). CHỈ phiên RUNNING (vi phạm chỉ tính
--   khi đang chạy). Trả count mới; KHÔNG RUNNING / không tồn tại → -1 (route coi như no-op).
--   MVP: KHÔNG auto-fail — chỉ đếm để cảnh báo (banner sau 3).
-- =====================================================================
CREATE OR REPLACE FUNCTION log_infraction(p_session_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE focus_sessions
       SET infraction_count = infraction_count + 1
     WHERE id = p_session_id AND status = 'RUNNING'
    RETURNING infraction_count INTO v_count;

    RETURN COALESCE(v_count, -1);
END $$;

-- =====================================================================
-- validate_voucher(p_code, p_venue_id)  🟢  — specs.md §4 Module 4 (POS redeem)
--   Redeem NGUYÊN TỬ: UPDATE ... WHERE status='RESERVED' AND chưa hết hạn RETURNING.
--   FOUND → 'VALID' (đúng 1 dòng — chống double-redeem race: 2 request đồng thời chỉ 1
--   khớp 'RESERVED', request kia thấy đã REDEEMED → 0 dòng). 0 dòng → truy vấn phụ phân biệt:
--   không tồn tại / hết hạn → 'INVALID' · AVAILABLE → 'NOT_CLAIMED' · REDEEMED → 'USED' (+redeemed_at).
-- =====================================================================
CREATE OR REPLACE FUNCTION validate_voucher(p_code VARCHAR, p_venue_id UUID)
RETURNS TABLE(out_status TEXT, out_redeemed_at TIMESTAMPTZ)
LANGUAGE plpgsql AS $$
DECLARE
    v_redeemed TIMESTAMPTZ;
    v_row      RECORD;
BEGIN
    UPDATE vouchers
       SET status = 'REDEEMED', redeemed_at = NOW()
     WHERE code = p_code AND venue_id = p_venue_id
       AND status = 'RESERVED'
       AND (expires_at IS NULL OR expires_at > NOW())
    RETURNING redeemed_at INTO v_redeemed;

    IF FOUND THEN
        RETURN QUERY SELECT 'VALID'::TEXT, v_redeemed; RETURN;
    END IF;

    SELECT status, redeemed_at INTO v_row
        FROM vouchers WHERE code = p_code AND venue_id = p_venue_id LIMIT 1;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'INVALID'::TEXT, NULL::TIMESTAMPTZ; RETURN;     -- không tồn tại
    END IF;
    IF v_row.status = 'AVAILABLE' THEN
        RETURN QUERY SELECT 'NOT_CLAIMED'::TEXT, NULL::TIMESTAMPTZ; RETURN;
    END IF;
    IF v_row.status = 'REDEEMED' THEN
        RETURN QUERY SELECT 'USED'::TEXT, v_row.redeemed_at; RETURN;
    END IF;
    -- RESERVED nhưng hết hạn (UPDATE ở trên không khớp do expires_at) → không hợp lệ.
    RETURN QUERY SELECT 'INVALID'::TEXT, NULL::TIMESTAMPTZ; RETURN;
END $$;

-- =====================================================================
-- TF-4: Row-Level Security — multi-tenant isolation + anon gate
-- Nguồn: docs/specs.md §5.
-- Idempotent: DROP POLICY IF EXISTS → CREATE POLICY (re-run an toàn).
-- service_role (createAdminClient) bypass RLS hoàn toàn → user flow OK.
-- =====================================================================

-- --- Bật RLS ---
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues         ENABLE ROW LEVEL SECURITY;

-- --- focus_sessions ---
-- (1) Anon tạo phiên (user flow không cần auth)
DROP POLICY IF EXISTS anon_insert_session ON focus_sessions;
CREATE POLICY anon_insert_session ON focus_sessions
  FOR INSERT TO anon WITH CHECK (true);

-- (2) Authenticated admin chỉ đọc/ghi venue của mình.
--     (SELECT auth.uid()) để Postgres cache — tránh re-eval mỗi row.
DROP POLICY IF EXISTS venue_isolation_sessions ON focus_sessions;
CREATE POLICY venue_isolation_sessions ON focus_sessions
  FOR ALL TO authenticated
  USING ( venue_id IN (SELECT venue_id FROM venue_admin_users
                       WHERE supabase_uid = (SELECT auth.uid())) );

-- --- vouchers ---
-- Admin chỉ thấy voucher của venue mình.
DROP POLICY IF EXISTS venue_isolation_vouchers ON vouchers;
CREATE POLICY venue_isolation_vouchers ON vouchers
  FOR ALL TO authenticated
  USING ( venue_id IN (SELECT venue_id FROM venue_admin_users
                       WHERE supabase_uid = (SELECT auth.uid())) );

-- --- venues ---
-- Owner/Manager cập nhật location venue của mình (RQ-001 / TV2-10).
DROP POLICY IF EXISTS venue_update_by_admin ON venues;
CREATE POLICY venue_update_by_admin ON venues
  FOR UPDATE TO authenticated
  USING ( id IN (SELECT venue_id FROM venue_admin_users
                 WHERE supabase_uid = (SELECT auth.uid())) )
  WITH CHECK ( id IN (SELECT venue_id FROM venue_admin_users
                      WHERE supabase_uid = (SELECT auth.uid())) );
