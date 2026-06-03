# specs.md — Off-Phone Rewards · Technical Source of Truth

> **Quan hệ tài liệu:**
> - `off-phone-rewards-PRD-v3.1.md` = **tầm nhìn sản phẩm & kinh doanh** (north star, không sửa khi code).
> - `specs.md` (file này) = **hợp đồng kỹ thuật DUY NHẤT cho bản build**. Khi PRD và file này lệch nhau → **file này thắng** ở phần kỹ thuật.
> - `todo.md` = task tracker, phải khớp scope ở đây.
>
> **Chiến lược (đã chốt): Hybrid — nền móng scale-ready, scope pilot tinh gọn.**
> Schema dựng đầy đủ ngay (không phải rename về sau), chống race ở tầng DB, có Blind Box validation.
> Hardening chống-gian-lận nâng cao defer sang *Fast-follow* (trước khi onboard quán trả phí).

**Chú thích scope:**
`🟢 MVP` = làm trong pilot · `🟡 FAST-FOLLOW` = schema sẵn, code trước quán trả phí · `🔵 V2` = sau.

---

## 0. Nguyên tắc nền tảng (đọc trước)

1. **SERVER TIME là luật.** Mọi quyết định nghiệp vụ theo thời gian tính bằng Postgres `NOW()` — **không** `Date.now()` / `new Date().getDay()` ở Node, kể cả trong Server Action. Client chỉ dùng thời gian để *hiển thị*.
2. **Idempotency & uniqueness phải ở tầng DB (constraint/unique index), không phải app-check.** App-check luôn thua race condition khi có tải đồng thời.
3. **Pooler-safe.** Vercel serverless + Postgres → bắt buộc dùng **Supabase Supavisor (transaction mode, port 6543)** cho Server Actions. Vì transaction-mode pooler không giữ session, **không** dùng `BEGIN…COMMIT` trải nhiều câu lệnh từ Node; gói logic đa-bước-nguyên-tử vào **một Postgres function (RPC)** gọi một lần.

---

## 1. DB Schema (đầy đủ, forward-compatible)

> Dùng `gen_random_uuid()` (có sẵn trong Supabase, không cần `uuid-ossp`).

### 1.1 venues  🟢
```sql
CREATE TABLE venues (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255)     NOT NULL,
    latitude          DOUBLE PRECISION NOT NULL,
    longitude         DOUBLE PRECISION NOT NULL,
    radius_meters     SMALLINT         NOT NULL DEFAULT 20,
    timezone          TEXT             NOT NULL DEFAULT 'Asia/Ho_Chi_Minh', -- cho weekday quest rotation
    sub_quest_config  JSONB            NOT NULL DEFAULT '[]'::jsonb,        -- Blind Box (xem §3)
    branding          JSONB            NOT NULL DEFAULT '{}'::jsonb,        -- 🟢 màu + tên challenge
    pos_api_key_hash  VARCHAR(255),                                        -- 🔵 V2 (Chain POS API)
    active            BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
```

### 1.2 focus_sessions  🟢
```sql
CREATE TYPE session_status AS ENUM ('RUNNING','COMPLETED','FAILED','EXPIRED');

CREATE TABLE focus_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id            UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    guest_token         TEXT NOT NULL,
    device_fingerprint  VARCHAR(64),                       -- 🟡 cột sẵn, MVP chưa enforce
    start_time          TIMESTAMPTZ NOT NULL DEFAULT NOW(),-- ← SOURCE OF TRUTH
    completed_at        TIMESTAMPTZ,
    status              session_status NOT NULL DEFAULT 'RUNNING',
    sub_quest_passed    BOOLEAN NOT NULL DEFAULT FALSE,    -- 🟢 gate claim
    sub_quest_response  TEXT,
    infraction_count    SMALLINT NOT NULL DEFAULT 0,
    ip_address          INET,                              -- nullable (proxy edge case)
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IDEMPOTENCY Ở TẦNG DB: tối đa 1 phiên RUNNING / (token, venue).
-- Chặn 2 lần bấm START đồng thời tạo 2 phiên (race).
CREATE UNIQUE INDEX uniq_running_session
    ON focus_sessions(guest_token, venue_id)
    WHERE status = 'RUNNING';
```

### 1.3 vouchers  🟢
```sql
CREATE TYPE voucher_status AS ENUM ('AVAILABLE','RESERVED','REDEEMED');

CREATE TABLE vouchers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    session_id  UUID REFERENCES focus_sessions(id) ON DELETE SET NULL,
    code        VARCHAR(50) NOT NULL,
    status      voucher_status NOT NULL DEFAULT 'AVAILABLE',
    assigned_at TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, code)         -- code unique theo venue (đa-tenant đúng hơn global unique)
);

-- CRITICAL: 1 voucher / session. Đây là constraint GIẾT bug "cấp 2 voucher cho 1 session".
CREATE UNIQUE INDEX uniq_voucher_per_session
    ON vouchers(session_id) WHERE session_id IS NOT NULL;

-- POS lookup
CREATE INDEX idx_vouchers_pos ON vouchers(venue_id, code);
-- Quét pool khi claim
CREATE INDEX idx_vouchers_available ON vouchers(venue_id) WHERE status = 'AVAILABLE';
```

### 1.4 bypass_otps  🟡 (schema sẵn, MVP dùng static code — xem §4 Module 3)
```sql
CREATE TABLE bypass_otps (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id      UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    session_id    UUID NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
    otp_code      VARCHAR(6) NOT NULL,
    created_by_ip INET,
    used_at       TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bypass_otp_lookup
    ON bypass_otps(otp_code, session_id) WHERE used_at IS NULL;
```

### 1.5 device_daily_limits  🟡 (rate-limit 3 lớp)
```sql
CREATE TABLE device_daily_limits (
    fingerprint        VARCHAR(64) NOT NULL,
    venue_id           UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    date               DATE NOT NULL DEFAULT CURRENT_DATE,
    successful_claims  SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (fingerprint, venue_id, date)
);
```

### 1.6 venue_admin_users  🔵 V2 (Admin UI + RLS)
```sql
CREATE TABLE venue_admin_users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id     UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    email        VARCHAR(255) NOT NULL UNIQUE,
    supabase_uid UUID NOT NULL UNIQUE,
    role         VARCHAR(20) NOT NULL DEFAULT 'owner', -- owner | staff
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Status flows:**
- session: `RUNNING → COMPLETED | EXPIRED | FAILED`
- voucher: `AVAILABLE → RESERVED (claim) → REDEEMED (POS)`

**Seed pilot 🟢:** 1 venue (lat/lng thật + `timezone`, `branding`, `sub_quest_config` có ≥1 quest `code_entry` + 1 `physical_action`) + 20 voucher `OPR-XXXX-XXXX` status `AVAILABLE`.

---

## 2. Atomic claim function (pooler-safe)  🟢

Toàn bộ check thời gian + idempotency + cấp voucher gói trong **một** function, gọi 1 lần từ Server Action (an toàn với transaction-mode pooler).

```sql
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

    -- Cấp nguyên tử: 1 session chỉ lấy được 1 voucher (uniq_voucher_per_session bảo chứng)
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
```

> So với pseudo-code PRD: bỏ `Date.now()`, bỏ `BEGIN/COMMIT` thủ công ở Node, idempotency dựa vào `FOR UPDATE` + unique index thay vì SELECT-rồi-INSERT ngoài transaction (vốn cấp được 2 voucher khi chạy song song).

---

## 3. Blind Box — Sub-quest  🟢 (MVP: `code_entry` + `physical_action`)

`venues.sub_quest_config` (JSONB) — xem PRD §3.2/§3.3 cho cấu trúc đầy đủ 5 loại. MVP triển khai 2 loại; 3 loại còn lại (`numeric_range`, `observation`, `free_text`) schema sẵn, bật ở Fast-follow.

```json
{
  "rotation_mode": "weekday",
  "quests": [
    { "id": "box_code", "type": "code_entry", "active_weekdays": [1,2,3,4,5,6,0],
      "content": { "title": "🔓 Mở Blind Box", "description": "Nhập mã trên mảnh giấy trong hộp.",
                   "answer_hash": "<bcrypt_hash>", "hint": "Mã 4 chữ số." } },
    { "id": "stretch", "type": "physical_action", "active_weekdays": [1,2,3,4,5,6,0],
      "content": { "title": "🤸 Đứng dậy vươn vai", "description": "Đứng dậy, vươn vai 3 cái.",
                   "confirm_button": "✅ Đã xong" } }
  ]
}
```

**`validateSubQuest(sessionId, venueId, answer?, confirmed?)`** → `{ valid }`
1. Load `sub_quest_config` của venue.
2. **Chọn quest theo weekday tính bằng SQL theo timezone venue** — KHÔNG `new Date().getDay()`:
   `SELECT EXTRACT(DOW FROM (NOW() AT TIME ZONE v.timezone))::int` → match `active_weekdays`.
3. Validate theo loại:
   - `code_entry` → `bcrypt.compare(answer.trim().toLowerCase(), quest.content.answer_hash)`. **Không bao giờ trả đáp án về client.**
   - `physical_action` → `confirmed === true` (honor system).
   - 🟡 `numeric_range` → `min_value ≤ parseInt(answer) ≤ max_value`.
   - 🟡 `observation` / `free_text` → `answer.trim().length ≥ min_length`.
4. Nếu valid → `UPDATE focus_sessions SET sub_quest_passed = TRUE, sub_quest_response = $answer WHERE id = $1`.

`claim_voucher` chặn nếu `sub_quest_passed = FALSE` (xem §2).

---

## 4. Server Actions

### Module 1 — `createSession(guest_token, venue_id)`  🟢
1. FE: localStorage `guest_token` → null thì `crypto.randomUUID()` → lưu.
2. BE: validate UUID format → **rate-limit 🟢 1 lớp**: reject nếu đã có session `COMPLETED` hôm nay cùng (token, venue) [`completed_at::date = CURRENT_DATE`].
3. INSERT phiên mới với `start_time = DEFAULT NOW()`. **Idempotency do `uniq_running_session` bảo chứng**: nếu đã có phiên RUNNING → INSERT vi phạm unique → bắt lỗi, `SELECT` trả phiên RUNNING cũ (Resume Flow).
4. Return `{ session_id, start_time }`.
- Dùng **admin client** (service_role), không dùng public client.
- 🟡 Fast-follow: thêm lớp IP rate-limit + device fingerprint (`device_daily_limits`).

### Module 2 — Server Timer & Phase Machine  🟢
`Δt = EXTRACT(EPOCH FROM (NOW() - start_time))` — tính phía Postgres.

| Pha | Δt (giây) | State | UI |
|---|---|---|---|
| 1 | 0–900 (0–15') | `ONLINE_SUDOKU` | Countdown + Sudoku grid tĩnh |
| 2 | 900–2100 (15–35') | `OFFLINE_QUEST` | Vibrate + visual pulse + **Blind Box (nhập/confirm)** |
| 3 | 2100–2700 (35–45') | `MEDITATION` | Hourglass SVG + lo-fi audio |
| - | 2700–2880 (45–48') | `CLAIMABLE` | Nút CLAIM (chỉ khi `sub_quest_passed`) |
| - | >2880 (>48') | `EXPIRED` | Lazy `UPDATE status='EXPIRED'` (🟡 cron dọn về sau) |

`/api/session-status` trả `{ delta_seconds, phase, status, sub_quest_passed, claim_window_open, claim_window_expired }`.
- Polling FE mỗi 30s; client tick local giữa 2 lần poll, resync mỗi poll.
- `visibilitychange` → POST `/api/log-infraction` → INCREMENT `infraction_count`. MVP: warning sau 3 lần, **không** auto-fail.

### Module 3 — Geolocation & presence auth  🟢
- Claim window: SQL trong `claim_voucher` (45–48'). Action **không** tự tính bằng `Date.now()`.
- Haversine (`lib/haversine.ts`, có test điểm biết trước): reject nếu `d > venue.radius_meters`. **Không lưu toạ độ** — tính rồi discard.
- **Bypass GPS 🟢 MVP:** so sánh `CASHIER_BYPASS_CODE` (env) bằng **constant-time** (chống timing attack). Hợp lý khi pilot luôn có nhân viên tại quầy.
- **🟡 Fast-follow → OTP động:** `generateBypassOTP` sinh 6 số bằng `crypto.randomInt` (KHÔNG `Math.random`), TTL 5', single-use, gắn `session_id`; thay thế static code trước khi onboard quán trả phí.
- Trình tự action: validate presence (GPS Haversine **hoặc** bypass) → gọi RPC `claim_voucher` (RPC là nơi nguyên tử cuối cùng, tự re-check window + cấp voucher).

### Module 4 — POS Validation  🟢
Cashier mở `/validate` → nhập code → action UPDATE nguyên tử:
```sql
UPDATE vouchers SET status='REDEEMED', redeemed_at=NOW()
WHERE code=:code AND venue_id=:venue_id AND status='RESERVED' AND (expires_at IS NULL OR expires_at > NOW())
RETURNING id;
```
- `RETURNING` có 1 dòng → ✅ Hợp lệ 10% Off.
- 0 dòng → phân biệt thông báo bằng truy vấn phụ: AVAILABLE → "Chưa được claim" ❌ · REDEEMED → "Đã dùng lúc {redeemed_at}" ⚠️ · không tồn tại/hết hạn → ❌.
- 🔵 V2: `POST /api/v1/vouchers/redeem` + `pos_api_key` cho Gói Chain.

---

## 5. Row-Level Security  🔵 V2 (bật khi có Admin UI)

> ⚠️ **Cảnh báo thứ tự bật:** nếu bật RLS mà chỉ có policy admin-isolation thì **anon sẽ bị chặn INSERT `focus_sessions`** → app chết. Phải có **cả** policy cho anon **và** policy isolation cho admin trước khi `ENABLE`.

```sql
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers       ENABLE ROW LEVEL SECURITY;

-- (1) Anon được tạo phiên (user flow không auth)
CREATE POLICY anon_insert_session ON focus_sessions
  FOR INSERT TO anon WITH CHECK (true);

-- (2) Admin chỉ đọc/ghi dữ liệu venue mình.
--     Bọc auth.uid() trong (SELECT ...) để Postgres cache → tránh re-eval mỗi row (gotcha hiệu năng Supabase).
CREATE POLICY venue_isolation_sessions ON focus_sessions
  FOR ALL TO authenticated
  USING ( venue_id IN (SELECT venue_id FROM venue_admin_users
                       WHERE supabase_uid = (SELECT auth.uid())) );
CREATE POLICY venue_isolation_vouchers ON vouchers
  FOR ALL TO authenticated
  USING ( venue_id IN (SELECT venue_id FROM venue_admin_users
                       WHERE supabase_uid = (SELECT auth.uid())) );

-- service_role (Server Actions) bypass RLS hoàn toàn → user flow vẫn chạy.
```

---

## 6. Non-Functional Requirements

| Rule | Detail |
|---|---|
| No auth | Không sign-in/signup trong user flow |
| Server time | Mọi Δt + quyết định nghiệp vụ tính phía server (Postgres `NOW()`) — client chỉ display |
| GPS privacy | Không lưu toạ độ — tính Haversine rồi discard (lưu ý Nghị định 13/2023 khi launch public) |
| Rate limit | 🟢 1 voucher / guest_token / venue / ngày · 🟡 +IP +fingerprint |
| Zero staff | Nhân viên chỉ tham gia tại POS redemption (+ cấp bypass khi GPS lỗi) |
| Pooler | Server Actions qua Supavisor transaction mode (6543); logic đa-bước-nguyên-tử = RPC |
| iOS vibrate | `navigator.vibrate` silent-fail Safari → luôn có visual fallback |
| Audio gate | Lo-fi chỉ phát sau user gesture (nút START unlock AudioContext) |

---

## 7. Physical Artifacts (O2O)

| Artifact | Mô tả |
|---|---|
| Standee | Card A6 matte, QR + copy "Gác lại mạng xã hội 45 phút = Giảm 10% ly tiếp theo" |
| Blind Box | Hộp acrylic khoá số 4 chữ số (mã = đáp án quest `code_entry`, hash trong `sub_quest_config`), chứa snack + sub-quest |
| Stranger's Notebook | Sổ giấy: đọc ghi chú cũ + viết cảm nhận (gắn quest `free_text`/`observation` ở Fast-follow) |

---

## 8. Câu hỏi mở (cần chốt trước sprint — từ PRD §7.2)

1. Hiệu lực voucher: dùng ngay trong buổi hay tích lũy 3 ngày (hiện schema để 3 ngày)?
2. Sudoku Pha 1: random hay tập cố định 10–20 puzzle xoay vòng (MVP đề xuất: tĩnh)?
3. Sở hữu dữ liệu hành vi (venue vs Off-Phone) — chốt sớm tránh tranh chấp.
4. Kiểm duyệt nội dung Sổ Nhật Ký (`free_text`).
5. Nghị định 13/2023/NĐ-CP: consent thu thập IP/fingerprint/GPS trước khi launch public.
6. Cơ chế nạp lại kho voucher + ngưỡng & kênh alert (🟡 cron alert khi kho < 20).
