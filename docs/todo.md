# todo.md — Off-Phone Rewards · Task Tracker

> Scope: **Hybrid — nền móng scale-ready, pilot tinh gọn.** Chi tiết kỹ thuật ở `specs.md`.
> Tag: 🟢 MVP (làm ngay) · 🟡 Fast-follow (trước quán trả phí) · 🔵 V2.

## Tổng quan tiến độ

| Phase | Tasks | Xong | % |
|---|---|---|---|
| Phase 0: Setup | 4 | 3 | 75% |
| Phase 1: Session Auth | 3 | 3 | 100% |
| Phase 2: Timer, Phases & Blind Box | 7 | 1 | 14% |
| Phase 3: Claim & Voucher | 5 | 0 | 0% |
| Phase 4: POS Validation | 2 | 0 | 0% |
| Phase 5: Polish | 4 | 0 | 0% |
| **Tổng MVP (🟢)** | **25** | **7** | **28%** |

---

## Phase 0 — Setup

### [x] T0-1: Initialize Next.js project
**Deps:** Không
**Context:** Scaffold project với TypeScript, Tailwind, App Router (không dùng Pages Router). ESLint. Xoá boilerplate mặc định.
**Checklist:**
- [x] `npx create-next-app@latest --typescript --tailwind --app --eslint` (pin **@14** → Next 14.2.35, đúng stack CLAUDE.md)
- [x] `.env.example` có đủ keys (xem CLAUDE.md), values để trống
- [x] `.gitignore` có: node_modules, .env.local, .next, docs/scratch/*.md
- [x] `npm run dev` chạy được localhost:3000 (HTTP 200, GET / 200)

### [x] T0-2: Supabase client setup
**Deps:** T0-1
**Context:** Tạo 2 client riêng: public (anon key) cho FE, admin (service_role) chỉ dùng trong Server Actions. Admin client throw error nếu gọi từ client-side. **Server Actions kết nối qua Supavisor transaction pooler (port 6543).**
**Checklist:**
- [x] `npm install @supabase/supabase-js` (^2.107.0)
- [x] `lib/supabase.ts` export `createPublicClient()` và `createAdminClient()`
- [x] `createAdminClient` check `typeof window !== 'undefined'` → throw nếu chạy ở client (có test)
- [x] Admin client trỏ connection qua pooler 6543 — *làm rõ:* supabase-js đi qua PostgREST/HTTPS, KHÔNG nhận port → pooler-safe thoả qua Invariant #2 (RPC). Doc trong `lib/supabase.ts`. Connection-string 6543 chỉ áp dụng nếu sau này thêm kết nối Postgres trực tiếp.
- [x] Test connect thành công — *test factory ✓ (5 pass); live round-trip viết sẵn nhưng skip tới khi có creds thật (sau T0-4)*

### [x] T0-3: Database schema + seed (đầy đủ, scale-ready)
**Deps:** T0-2
**Context:** Apply **toàn bộ schema trong specs.md §1** (6 bảng — kể cả cột/bảng 🟡🔵 để khỏi migrate-rename sau) + **constraint chống race** + **function `claim_voucher` (specs.md §2)**. RLS bảng deferred sang Fast-follow (xem specs.md §5 — KHÔNG bật RLS ở MVP để anon INSERT được).
**Checklist:**
- [x] `supabase/schema.sql` đủ 6 bảng + ENUM types + `gen_random_uuid()` (idempotent: DO-block enum, IF NOT EXISTS, CREATE OR REPLACE fn)
- [x] Unique index **`uniq_running_session`** (idempotency phiên RUNNING)
- [x] Unique index **`uniq_voucher_per_session`** (chống cấp 2 voucher/session)
- [x] Index `idx_vouchers_pos`, `idx_vouchers_available`
- [x] Function `claim_voucher(session_id, venue_id)` (specs.md §2) — **test bằng SQL: 8 nhánh PASS + race thật 8 claim song song → đúng 1 voucher** (`supabase/tests/claim_voucher_test.sql`)
- [x] Seed 1 venue: lat/lng (HCMC placeholder — TODO toạ độ thật) + `timezone` + `branding` + `sub_quest_config` (`code_entry` bcrypt verify "1234"✓ + `physical_action`). VENUE_ID cố định `11111111-…-111111111111`
- [x] Seed 20 vouchers `OPR-XXXX-XXXX` status='AVAILABLE' (deterministic md5)
- [x] Schema apply ~~vào Supabase dashboard~~ — *validate tương đương trên **Postgres 16 (Docker)**; apply lên Supabase thật defer sang T0-4 (cần project/creds). Xem D-015.*

### [ ] T0-4: Vercel deployment 🔄
**Deps:** T0-1
**Context:** Link project Vercel, set env vars, confirm auto-deploy từ main branch.
**Trạng thái (Session 4):** Nửa Supabase/local ✅ verified — schema/seed đã apply lên Supabase THẬT, `verify:supabase` xanh (venue + 20 voucher + RPC), `npm test` 6 PASS/0 SKIP, `npm run build` exit 0 → **đóng D-014 + D-015**. Nửa Vercel **DEFERRED** (user tạm chưa push/deploy được). Chi tiết: HISTORY Session 4.
**Checklist:**
- [ ] Project live trên Vercel URL
- [ ] Env vars set trong Vercel dashboard (5 biến; URL = `https://lcpfzkjovvnihfueewix.supabase.co` KHÔNG `/rest/v1/`)
- [ ] Auto-deploy từ git push main hoạt động

---

## Phase 1 — Session Auth

### [x] T1-1: useGuestToken hook ✅ (Session 5)
**Deps:** T0-1
**Context:** `hooks/useGuestToken.ts`. Check localStorage → nếu null: `crypto.randomUUID()` → lưu. Không chạy trong SSR.
**Checklist:**
- [x] Export `{ token, isReady }` — isReady=false trong SSR, true sau hydration
- [x] Token persist qua page refresh
- [x] Không crash khi SSR (`typeof window !== 'undefined'`)

### [x] T1-2: createSession Server Action ✅ (Session 6)
**Deps:** T0-3
**Context:** `actions/createSession.ts` (specs.md §4 Module 1). Validate UUID → rate limit 1/ngày/token/venue → INSERT `start_time = DEFAULT NOW()`. **Idempotency do `uniq_running_session` bảo chứng** (không app-check): bắt unique-violation → SELECT trả phiên RUNNING cũ.
**Impl:** gói rate-limit + resume + INSERT vào RPC `create_session` (atomic, pooler-safe). Rate-limit theo NGÀY ĐỊA PHƯƠNG `venue.timezone` (không `CURRENT_DATE`/UTC). venue_id từ env. Live test race+resume+rate-limit PASS trên Supabase thật.
**Checklist:**
- [x] Validate UUID format, reject nếu sai
- [x] Idempotent qua unique index: gọi 2 lần đồng thời → cùng session_id (KHÔNG tạo 2)
- [x] Rate limit: reject nếu có session COMPLETED hôm nay (token+venue — impl ngày địa phương `venue.timezone`)
- [x] `start_time` do server set — không nhận từ client
- [x] Dùng `createAdminClient()`

### [x] T1-3: Landing page ✅ (Session 7)
**Deps:** T1-1, T1-2
**Context:** `app/page.tsx`. Copy theo triết lý PRD §1.2 ("Gác lại mạng xã hội 45 phút", KHÔNG "tắt điện thoại"). Nút START. Flow: createSession → sessionStorage → `/session?id=`.
**Impl:** Server Component (`app/page.tsx`, force-dynamic) fetch branding venue + fallback → `app/_components/Landing.tsx` (client). Render verify thật `curl` 200 + đủ copy + màu branding.
**Checklist:**
- [x] Copy: 45 phút gác mạng xã hội → giảm 10% ly tiếp theo
- [x] START gọi createSession với token từ useGuestToken + unlock AudioContext (gesture)
- [x] session_id lưu sessionStorage sau khi tạo
- [x] Redirect sang /session sau success (đích /session là T2-2)
- [x] Loading state + error messages thân thiện
- [x] Áp `branding` (màu + tên challenge) từ venue

---

## Phase 2 — Timer, Phases & Blind Box

### [x] T2-1: Session status API ✅ (Session 8)
**Deps:** T0-3, T1-2
**Context:** `app/api/session-status/route.ts` (specs.md §4 Module 2). Δt bằng SQL. Map phase. Lazy expiry >2880s.
**Impl:** RPC `get_session_status` (Δt=`FLOOR(EXTRACT(EPOCH FROM NOW()-start_time))` + lazy-expiry atomic, Invariant #1/#2) trả raw facts; map phase + claim-window ở `lib/sessionStatus.ts` (pure, test offline mọi biên). Route: 400 id sai · 404 không thấy · 200 JSON `no-store`. Offline 6 test PASS; live RPC test + SQL test (`supabase/tests/get_session_status_test.sql`) sẵn — **chờ apply schema.sql lên Supabase**.
**Checklist:**
- [x] `delta_seconds = EXTRACT(EPOCH FROM (NOW() - start_time))` — SQL
- [x] Phase mapping: <900→1, 900-2100→2, 2100-2700→3, 2700-2880→CLAIMABLE, >2880→EXPIRED
- [x] Lazy expiry: RUNNING và >2880s → UPDATE status='EXPIRED'
- [x] Return: `{ delta_seconds, phase, status, sub_quest_passed, claim_window_open, claim_window_expired }`
- [x] 404 nếu session_id không tồn tại

### [ ] T2-2: Session page + Phase 1 UI
**Deps:** T2-1
**Context:** `app/session/page.tsx`. Poll mỗi 30s, tick local giữa poll. Phase 1: Sudoku 9x9 tĩnh (hardcode 1 puzzle hợp lệ).
**Checklist:**
- [ ] Poll mỗi 30s, update phase từ server response (không quyết phase bằng Date.now())
- [ ] Countdown = `serverDelta + (Date.now() - fetchTime)/1000`
- [ ] Sudoku 9x9 render rõ, border phân chia ô
- [ ] session_id không hợp lệ → redirect landing

### [ ] T2-3: Phase 2 UI — Offline Quest (Blind Box)
**Deps:** T2-2, T2-7
**Context:** Khi phase=2: vibrate + visual fallback + **UI Blind Box thật** (không chỉ card tĩnh). Render quest hôm nay từ `sub_quest_config`, wire vào `validateSubQuest`.
**Checklist:**
- [ ] `navigator.vibrate([200,100,200])` — không crash nếu không support
- [ ] Visual border pulse luôn chạy (kể cả iOS Safari) + AudioContext beep fallback
- [ ] `code_entry`: ô nhập mã → gọi validateSubQuest → pass/fail feedback
- [ ] `physical_action`: nút confirm → gọi validateSubQuest(confirmed=true)
- [ ] Khi `sub_quest_passed=true`: hiện trạng thái đã hoàn thành, không cho làm lại
- [ ] Hướng dẫn vật lý: mở Blind Box + Stranger's Notebook

### [ ] T2-4: Phase 3 UI — Meditation
**Deps:** T2-3
**Context:** Phase 3: fade text, hourglass SVG animated, lo-fi audio gated bởi prior gesture.
**Checklist:**
- [ ] Text fade-out mượt
- [ ] Hourglass SVG animate loop (không GIF)
- [ ] Lo-fi audio chỉ autoplay nếu có prior gesture (ref flag set khi START)
- [ ] Chưa có gesture → nút "Bật nhạc" thay vì autoplay

### [ ] T2-5: visibilitychange tracking
**Deps:** T2-2
**Context:** `visibilitychange` → POST `/api/log-infraction` → INCREMENT infraction_count.
**Checklist:**
- [ ] Listener đăng ký khi mount, cleanup khi unmount
- [ ] POST thực sự INCREMENT trong DB
- [ ] Warning banner sau 3 vi phạm
- [ ] MVP: không auto-fail session

### [ ] T2-6: Clock sync
**Deps:** T2-1, T2-2
**Context:** Offset client-server. Countdown lệch < 2s.
**Checklist:**
- [ ] Ghi `fetchTime = Date.now()` ngay khi nhận response
- [ ] Countdown = `serverDelta + (Date.now() - fetchTime)/1000`
- [ ] Resync mỗi poll thành công, smooth nếu lệch < 5s

### [ ] T2-7: validateSubQuest Server Action 🟢 (MVP: code_entry + physical_action)
**Deps:** T0-3
**Context:** `actions/validateSubQuest.ts` (specs.md §3). Chọn quest theo **weekday tính bằng SQL theo `venue.timezone`** (KHÔNG `new Date().getDay()`).
**Checklist:**
- [ ] Weekday: `EXTRACT(DOW FROM (NOW() AT TIME ZONE venue.timezone))` → match `active_weekdays`
- [ ] `code_entry`: `bcrypt.compare(answer.trim().toLowerCase(), answer_hash)` — KHÔNG trả đáp án về client
- [ ] `physical_action`: `confirmed === true`
- [ ] Valid → `UPDATE focus_sessions SET sub_quest_passed=TRUE, sub_quest_response=$answer`
- [ ] Không có quest cho hôm nay → lỗi rõ ràng
- [ ] (🟡 numeric_range/observation/free_text: để TODO, chưa làm MVP)

---

## Phase 3 — Claim & Voucher

### [ ] T3-1: CLAIM button logic
**Deps:** T2-1
**Context:** Hiện CLAIM khi `claim_window_open=true` **và** `sub_quest_passed=true`. Expired khi `claim_window_expired=true`.
**Checklist:**
- [ ] CLAIM chỉ hiện đúng window 45–48' (server field) và đã pass quest
- [ ] Chưa pass quest trong window → nhắc hoàn thành Blind Box
- [ ] Expired sau 48': message + link landing
- [ ] Nút to, nổi bật (CTA quan trọng nhất)

### [ ] T3-2: GPS coordinate capture
**Deps:** T3-1
**Context:** `getCurrentPosition({enableHighAccuracy:true, timeout:10000})`. OK → claimVoucher. Fail → T3-3.
**Checklist:**
- [ ] Loading "Đang lấy vị trí..."
- [ ] Timeout 10s
- [ ] PERMISSION_DENIED / TIMEOUT / UNAVAILABLE → fallback T3-3
- [ ] accuracy > 100m → warning nhưng vẫn tiếp tục

### [ ] T3-3: Manual bypass fallback 🟢 (MVP: static code)
**Deps:** T3-2
**Context:** GPS fail → nhập mã → validate `CASHIER_BYPASS_CODE` (constant-time). 🟡 Fast-follow: thay bằng OTP động (specs.md §4 Module 3).
**Checklist:**
- [ ] Fallback UI rõ ràng, không gây bực bội
- [ ] Server so sánh env var bằng constant-time (chống timing attack)
- [ ] Mã sai → lỗi thân thiện, không reveal lý do

### [ ] T3-4: claimVoucher Server Action (qua RPC claim_voucher)
**Deps:** T0-3, T3-2, T3-3
**Context:** `actions/claimVoucher.ts` (specs.md §2 + §4 Module 3). Action: validate presence (Haversine GPS **hoặc** bypass) → gọi **RPC `claim_voucher`** (nơi nguyên tử: re-check window SQL, gate sub_quest, cấp voucher, COMPLETED). KHÔNG tự tính thời gian bằng Date.now().
**Checklist:**
- [ ] Haversine trong `lib/haversine.ts` + test điểm biết trước
- [ ] Presence: GPS trong radius HOẶC bypass code hợp lệ
- [ ] Gọi RPC `claim_voucher` — không BEGIN/COMMIT thủ công ở Node
- [ ] Idempotent: session đã có voucher → trả lại code cũ (RPC lo)
- [ ] Map error RPC: SESSION_NOT_RUNNING / QUEST_NOT_PASSED / OUTSIDE_WINDOW / POOL_EMPTY → message thân thiện
- [ ] **Test race: 2 request đồng thời cùng session → đúng 1 voucher**

### [ ] T3-5: Voucher display screen
**Deps:** T3-4
**Context:** Success screen, voucher code to dạng coupon. Lưu sessionStorage.
**Checklist:**
- [ ] Code font lớn, monospace, dễ đọc, design ticket/coupon
- [ ] Lưu `claimed_voucher` sessionStorage, restore khi reload
- [ ] CTA "Thử lại ngày mai"

---

## Phase 4 — POS Validation

### [ ] T4-1: Cashier validation page
**Deps:** T0-1
**Context:** `app/validate/page.tsx`. Mobile-first. Input lớn + nút VALIDATE.
**Checklist:**
- [ ] Input + button đủ lớn trên mobile
- [ ] Hiện: ✅ Hợp lệ 10% Off | ❌ Chưa claim | ⚠️ Đã dùng | ❌ Không hợp lệ
- [ ] Tự clear input sau validate

### [ ] T4-2: validateVoucher Server Action
**Deps:** T0-3, T4-1
**Context:** `actions/validateVoucher.ts` (specs.md §4 Module 4). UPDATE REDEEMED atomic.
**Checklist:**
- [ ] UPDATE ... WHERE status='RESERVED' AND expires_at>NOW() RETURNING → 1 dòng = ✅
- [ ] 0 dòng → phân biệt AVAILABLE / REDEEMED / không tồn tại-hết hạn
- [ ] Atomic, chống double-redeem race

---

## Phase 5 — Polish

### [ ] T5-1: Session resume khi reload
**Deps:** T1-2, T2-2
**Context:** Load /session → check sessionStorage → gọi API → tiếp tục đúng phase. Không tạo session mới.
**Checklist:**
- [ ] Refresh → tiếp tục đúng phase, không mất tiến độ
- [ ] RUNNING → resume | COMPLETED → /claim | EXPIRED → landing + message

### [ ] T5-2: Edge case messages
**Deps:** T3-4, T1-2
**Checklist:**
- [ ] Rate limit: "Bạn đã hoàn thành challenge hôm nay. Quay lại ngày mai!"
- [ ] Pool empty: "Hết voucher hôm nay. Hỏi nhân viên để được hỗ trợ."
- [ ] Quest chưa pass khi tới window: nhắc quay lại Blind Box

### [ ] T5-3: Loading + error states
**Deps:** Tất cả task trên
**Checklist:**
- [ ] `app/loading.tsx` (spinner/skeleton)
- [ ] `app/error.tsx` với nút retry
- [ ] Không unhandled promise rejection

### [ ] T5-4: Smoke test end-to-end
**Deps:** Tất cả task trên
**Checklist:**
- [ ] QR → landing < 3s
- [ ] START → session tạo trong DB
- [ ] Phase transitions đúng thời điểm
- [ ] Blind Box: nhập mã đúng/sai hoạt động
- [ ] GPS claim hoạt động (toạ độ thật) + manual bypass
- [ ] Voucher hiển thị đúng
- [ ] POS validate ✅ và double redemption bị block ❌

---

## Fast-follow 🟡 — TRƯỚC khi onboard quán TRẢ PHÍ (không thuộc MVP pilot)

> Schema đã sẵn sàng (specs.md §1 đã có cột/bảng). Đây là phần code bật lên sau pilot.

- `[ ]` **TF-1:** OTP bypass động — `generateBypassOTP` (`crypto.randomInt`, TTL 5', single-use, gắn session_id); thay static `CASHIER_BYPASS_CODE`. (specs.md §4 Module 3)
- `[ ]` **TF-2:** Rate-limit 3 lớp — device fingerprint (SHA-256) + IP + `device_daily_limits`. (specs.md §4 Module 1)
- `[ ]` **TF-3:** Cron job — dọn phiên EXPIRED hằng giờ + alert khi kho voucher < 20.
- `[ ]` **TF-4:** RLS multi-tenant — bật `focus_sessions`/`vouchers` với CẢ policy anon-insert + venue-isolation (specs.md §5). Bắt buộc trước Admin UI.
- `[ ]` **TF-5:** Blind Box 3 loại còn lại — `numeric_range`, `observation`, `free_text` trong validateSubQuest.

---

## V2 🔵 — sau khi pilot validate xong

- `[V2]` **TV2-1:** Admin panel — thêm/xoá voucher, cấu hình venue + Blind Box (cần `venue_admin_users` + RLS)
- `[V2]` **TV2-2:** Analytics funnel — start/phase/quest/claim/redeem tracking
- `[V2]` **TV2-3:** Interactive Sudoku — Phase 1 chơi được
- `[V2]` **TV2-4:** i18n — `vi-VN` + `en-US`
- `[V2]` **TV2-5:** Multi-venue UI — chọn venue từ danh sách
- `[V2]` **TV2-6:** Dev time-compression — nén session để test nhanh
- `[V2]` **TV2-7:** GPS anomaly detection nâng cao
- `[V2]` **TV2-8:** PWA manifest — offline, Add to Home Screen
- `[V2]` **TV2-9:** POS REST API + `pos_api_key` (Gói Chain — KiotViet/Sapo)
