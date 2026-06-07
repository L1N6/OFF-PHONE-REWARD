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
    email        VARCHAR(255) NOT NULL,           -- NOT UNIQUE global: owner quản lý nhiều venue → nhiều row
    supabase_uid UUID NOT NULL,                   -- NOT UNIQUE global: cùng lý do
    role         VARCHAR(20) NOT NULL DEFAULT 'owner', -- owner | manager
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, supabase_uid)               -- 1 role / user / venue
);
```

**Role logic (RQ-001):**
- `owner`: đăng ký tự do (email/password Supabase Auth). Có thể có nhiều row (1 row/venue) — nghĩa là 1 người quản lý nhiều venue. Có thể invite manager vào từng venue.
- `manager`: được owner invite vào 1 venue cụ thể. Chỉ thấy/sửa venue đó. Không thể invite thêm người.

**Invite flow:** Owner gửi email invite → hệ thống tạo pending row (supabase_uid null) → Manager nhận link → đăng ký/đăng nhập Supabase Auth → supabase_uid được gắn vào row.

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

### Module 5 — Venue Location Setup  🔵 V2 (RQ-001)
Owner/Manager đăng nhập → trang `/admin/venue/location`:

1. **Lấy vị trí** (3 cách đồng bộ cùng ô lat/lng):
   - (a) **Bản đồ tương tác** (TV2-14, RQ-003 — Leaflet + OSM, **KHÔNG cần API key**): tìm địa chỉ (Photon, free) + click/kéo ghim → tự điền lat/lng; vòng tròn vẽ theo `radius_meters`.
   - (b) Nút "Lấy vị trí hiện tại" (Geolocation API, chủ quán mở tại quán).
   - (c) Nhập tay lat/lng. Map nạp client-only (`dynamic ssr:false`); lỗi map → (b)/(c) vẫn dùng được.
2. **Chỉnh bán kính:** `radius_meters` input số (10–500m, gợi ý 20–50m cho quán nhỏ).
3. **Server Action `updateVenueLocation(venueId, lat, lng, radius)`:**
   - Validate: lat ∈ [-90, 90] · lng ∈ [-180, 180] · radius ∈ [10, 500]
   - Kiểm tra quyền: `venue_admin_users` có row (venueId, auth.uid()) — KHÔNG tin client
   - `UPDATE venues SET latitude=?, longitude=?, radius_meters=? WHERE id=?`
   - Dùng `createAdminClient()` (service_role bypass RLS — server action)
4. **Hiệu lực ngay:** GPS claim của guest dùng toạ độ mới sau khi lưu (không cần restart).

> Scope RQ-001 chỉ gồm location. Branding + sub_quest_config cấu hình: tách task riêng (TV2-1 mở rộng).

### Module 6 — Venue Theme Setup  🔵 V2 (RQ-002)
Owner/Manager đăng nhập → trang `/admin/venue/theme`:

1. **Chọn theme:** lưới card N **theme preset** (xem §9) + live preview (mockup điện thoại mini).
2. **Server Action `updateVenueTheme(venueId, themeId)`:**
   - Validate: `themeId` ∈ whitelist preset (§9.3) — KHÔNG tin client · `venueId` UUID hợp lệ
   - Quyền: `venue_admin_users` có row (venueId, auth.uid()) — owner HOẶC manager (ADR-011)
   - Merge JSONB giữ field khác: `branding = branding || {"theme_id": themeId}` (đọc-merge-ghi ở action vì admin-op ít đồng thời; RPC `set_venue_theme` nếu sau cần atomic)
   - Dùng `createAdminClient()` (service_role bypass RLS)
3. **Hiệu lực ngay:** luồng khách của venue đọc `branding.theme_id` → áp token theme (không deploy lại).

### Module 7 — Analytics Funnel  🔵 V2 (TV2-2)
Owner/Manager đăng nhập → trang `/admin/venue/analytics`:

1. **Phễu chuyển đổi 4 bước** (suy từ `focus_sessions` + `vouchers`, KHÔNG event-log — ADR-014):
   - **Bắt đầu phiên** = tổng `focus_sessions` của venue (mọi status)
   - **Qua Blind Box** = `sub_quest_passed = TRUE`
   - **Nhận voucher** = session `status = 'COMPLETED'` (claim_voucher cấp voucher + set COMPLETED)
   - **Dùng tại quán** = voucher `status = 'REDEEMED'` (POS validate)
   - Mỗi bước hiển thị count + % so với bước đầu + % giữ lại so với bước trước.
2. **Số liệu phụ:** tỉ lệ chuyển đổi tổng (`redeemed / total`) · breakdown trạng thái phiên (RUNNING/COMPLETED/FAILED/EXPIRED) · pool voucher (AVAILABLE/RESERVED/REDEEMED).
3. **Truy vấn:** 9 `count` query (`count:'exact', head:true`) qua `createAdminClient()` (service_role bypass RLS); quyền: `venue_admin_users` có row (venueId, auth.uid()) — owner HOẶC manager (ADR-011).
4. **Tính funnel:** pure ở `lib/analytics.ts` (`buildFunnel`/`conversionRate`/`pct` chia-0 an toàn) — test offline mọi biên.

> **Defer:** "Phase reach" (đạt Pha 2/3) cần event-log (phase là time-derived, không lưu per-session) → task V2 riêng. Số liệu hiện là snapshot tức thời (chưa time-series). Xem ADR-014.

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

-- (3) Owner/Manager cập nhật location venue của mình (RQ-001)
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY venue_update_by_admin ON venues
  FOR UPDATE TO authenticated
  USING ( id IN (SELECT venue_id FROM venue_admin_users
                 WHERE supabase_uid = (SELECT auth.uid())) )
  WITH CHECK ( id IN (SELECT venue_id FROM venue_admin_users
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

---

## 9. Design System & Theming  🔵 V2 (RQ-002)

### 9.1 Nguyên tắc
Một ngôn ngữ thiết kế DUY NHẤT cho cả 3 mảng (khách · POS · admin): **thân thiện, gần gũi, độ tuổi 15–40**.
Bo góc mềm (`rounded-2xl`), shadow nhẹ, spacing thoáng, tap-target lớn (mobile-first), font bo tròn hỗ trợ
tiếng Việt đầy đủ dấu. **Luồng khách** áp theme của venue; **admin + POS** giữ tông trung tính-thân thiện cố định.

### 9.2 Design tokens (CSS variables → Tailwind)
`globals.css :root` khai báo (default = theme `cozy_cafe`):
```
--color-primary / --color-primary-fg     --color-accent / --color-accent-fg
--color-bg --color-surface --color-text --color-muted --color-border
--color-success --color-warn --color-error
```
`tailwind.config.ts` map `colors.{primary,accent,surface,bg,text,muted,border,success,warn,error}` →
`var(--color-*)`. Component dùng `bg-primary text-primary-fg` … **KHÔNG hardcode `#hex` / `bg-blue-600`.**

### 9.3 Theme presets
`lib/theme.ts` (pure): `Theme = { id, name, primary, accent, surface, bg, mascot }` + `resolveTheme(themeId)`
(unknown → default `cozy_cafe`). Pilot **4 preset**:

| id | Tên | primary | accent | mascot |
|---|---|---|---|---|
| `cozy_cafe` *(default)* | Cozy Cafe | `#0F766E` teal ấm | `#F59E0B` amber | ☕ |
| `cat_cafe` | Vương quốc Mèo | `#FF9F7B` coral | `#FFE0D6` peach | 🐱 |
| `book_acoustic` | Sách & Acoustic | sage `#6B8E72` | kem `#EFE7D6` | 📖 |
| `lofi_night` | Lo-fi Night | indigo `#4F46E5` | tím `#A78BFA` | 🌙 |

(Custom-color tự do = V-sau.)

### 9.4 `venues.branding` JSONB contract
```json
{ "theme_id": "cozy_cafe", "challenge_name": "Gác Máy 45 Phút",
  "primary_color": "#0F766E", "accent_color": "#F59E0B" }
```
`primary_color`/`accent_color` = **override tuỳ chọn**; thiếu → lấy từ preset theo `theme_id`.
`lib/branding.ts` `parseBranding` đọc thêm `theme_id` (fallback `cozy_cafe`).

### 9.5 Áp theme cho khách (no-flash)
Guest root (Server Component) đọc `venue.branding.theme_id` → `resolveTheme` → render inline `style` set
các `--color-*` ngay từ SSR (không nhấp nháy). **Pha 3 Meditation** giữ dark/tĩnh riêng, KHÔNG theo theme.
