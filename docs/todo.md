# todo.md — Off-Phone Rewards · Task Tracker

> Scope: **Hybrid — nền móng scale-ready, pilot tinh gọn.** Chi tiết kỹ thuật ở `specs.md`.
> Tag: 🟢 MVP (làm ngay) · 🟡 Fast-follow (trước quán trả phí) · 🔵 V2.

## Tổng quan tiến độ

| Phase | Tasks | Xong | % |
|---|---|---|---|
| Phase 0: Setup | 4 | 4 | 100% |
| Phase 1: Session Auth | 3 | 3 | 100% |
| Phase 2: Timer, Phases & Blind Box | 7 | 7 | 100% |
| Phase 3: Claim & Voucher | 5 | 5 | 100% |
| Phase 4: POS Validation | 2 | 2 | 100% |
| Phase 5: Polish | 4 | 4 | 100% |
| **Tổng MVP (🟢)** | **25** | **25** | **100%** ✅ |

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

### [x] T0-4: Vercel deployment ✅ (Session 11)
**Deps:** T0-1
**Context:** Link project Vercel, set env vars, confirm auto-deploy từ main branch.
**Trạng thái:** Nửa Supabase/local ✅ (Session 4, đóng D-014/D-015). Nửa Vercel ✅ (Session 11) — LIVE tại `off-phone-reward-6t79.vercel.app`, verify curl prod đầy đủ.
**Checklist:**
- [x] Project live trên Vercel URL — `https://off-phone-reward-6t79.vercel.app` (`/` → 200 + branding `#0F766E`/`#F59E0B`)
- [x] Env vars set trong Vercel dashboard (5 biến) — verify `/api/session-status?id=<uuid>` → **404 SESSION_NOT_FOUND** (env+RPC live, KHÔNG 500)
- [x] Auto-deploy từ git push main — code đã push (`/session` T2-2 + API T2-1) có trên prod

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

### [x] T2-2: Session page + Phase 1 UI ✅ (Session 9)
**Deps:** T2-1
**Context:** `app/session/page.tsx`. Poll mỗi 30s, tick local giữa poll. Phase 1: Sudoku 9x9 tĩnh (hardcode 1 puzzle hợp lệ).
**Impl:** page (Server: validate `id` → redirect landing nếu sai) → `SessionView` (Client: poll `/api/session-status?id=` 30s + tick 1s; phase do SERVER quyết, Date.now() chỉ cho countdown display) → `Sudoku` (pure, 81 ô, border 3×3). Phase 2/3/CLAIMABLE = placeholder (T2-3/T2-4/T3-1); EXPIRED/COMPLETED có màn riêng. Mock dev `?mock=<delta>` verify offline mọi phase (MOCK-FIRST). Countdown + Sudoku tách `lib/` (test offline). Render thật `next dev`: 81 ô + 4 phase + redirect 307 OK.
**Checklist:**
- [x] Poll mỗi 30s, update phase từ server response (không quyết phase bằng Date.now())
- [x] Countdown = `serverDelta + (Date.now() - fetchTime)/1000`
- [x] Sudoku 9x9 render rõ, border phân chia ô
- [x] session_id không hợp lệ → redirect landing

### [x] T2-3: Phase 2 UI — Offline Quest (Blind Box) ✅ (Session 12)
**Deps:** T2-2, T2-7
**Context:** Khi phase=2: vibrate + visual fallback + **UI Blind Box thật** (không chỉ card tĩnh). Render quest hôm nay từ `sub_quest_config`, wire vào `validateSubQuest`.
**Impl:** RPC `get_active_quests` (weekday-SQL + **strip answer_hash**) → action getActiveQuests → `BlindBox.tsx` render code_entry(input)+physical_action(button) → `validateSubQuest` → feedback; passed→khoá Done. Vibrate+beep vào phase 2; visual pulse overlay `animate-pulse` luôn chạy (Inv #4). Mock "1234" cho dev. Docker SQL 3/3 + render mock phase 2 OK.
**Checklist:**
- [x] `navigator.vibrate([200,100,200])` — không crash nếu không support (guarded `typeof`)
- [x] Visual border pulse luôn chạy (kể cả iOS Safari) + AudioContext beep fallback (gated Inv #5)
- [x] `code_entry`: ô nhập mã → gọi validateSubQuest → pass/fail feedback
- [x] `physical_action`: nút confirm → gọi validateSubQuest(confirmed=true)
- [x] Khi `sub_quest_passed=true`: hiện trạng thái đã hoàn thành, không cho làm lại
- [x] Hướng dẫn vật lý: mở Blind Box + Stranger's Notebook ("Sổ Người Lạ")

### [x] T2-4: Phase 3 UI — Meditation ✅ (Session 13)
**Deps:** T2-3
**Context:** Phase 3: fade text, hourglass SVG animated, lo-fi audio gated bởi prior gesture.
**Impl:** `Meditation.tsx` — Hourglass inline SVG lật chậm CSS `animate-hourglass` + câu thiền fade-cycle `animate-med-fade`. Lo-fi = pad sine procedural (`startAmbient`/`stopAmbient` ở lib/audio, không cần file). Autoplay nếu `isAudioUnlocked()` (gesture START); chưa → nút "Bật nhạc". Render mock=2200 OK.
**Checklist:**
- [x] Text fade-out mượt (`animate-med-fade`, đổi câu mỗi 6s)
- [x] Hourglass SVG animate loop (không GIF) — inline SVG + CSS keyframe `hourglassFlip`
- [x] Lo-fi audio chỉ autoplay nếu có prior gesture (`isAudioUnlocked()` — module state, không sessionStorage)
- [x] Chưa có gesture → nút "Bật nhạc" thay vì autoplay (click = gesture → unlock + phát)

### [x] T2-5: visibilitychange tracking ✅ (Session 14)
**Deps:** T2-2
**Context:** `visibilitychange` → POST `/api/log-infraction` → INCREMENT infraction_count.
**Impl:** RPC `log_infraction` (`UPDATE infraction_count+1 WHERE RUNNING RETURNING`, atomic Inv #2; non-RUNNING→-1) + route `POST /api/log-infraction` + SessionView listener (hidden→fetch keepalive→set count) + banner đỏ ≥3. Docker SQL 3/3, curl POST 400 OK.
**Checklist:**
- [x] Listener đăng ký khi mount, cleanup khi unmount (`addEventListener`/`removeEventListener`)
- [x] POST thực sự INCREMENT trong DB (RPC atomic — Docker 3/3 + live-ready)
- [x] Warning banner sau 3 vi phạm (`infractions >= 3` → banner fixed-top)
- [x] MVP: không auto-fail session (chỉ đếm để cảnh báo)

### [x] T2-6: Clock sync ✅ (Session 15)
**Deps:** T2-1, T2-2
**Context:** Offset client-server. Countdown lệch < 2s.
**Impl:** Anchor `startEpochRef` (client-clock ms) resync mỗi poll qua pure `reconcileStartEpoch` (ease 34% khi lệch <5s / snap khi ≥5s) + `elapsedSince` → countdown KHÔNG giật. 5 unit test offline. (2 mục đầu đã có từ T2-2.)
**Checklist:**
- [x] Ghi `fetchTime = Date.now()` ngay khi nhận response (qua reconcileStartEpoch lúc poll)
- [x] Countdown = `serverDelta + (Date.now() - fetchTime)/1000` (tương đương `elapsedSince(anchor)`)
- [x] Resync mỗi poll thành công, smooth nếu lệch < 5s (ease) / snap khi ≥5s

### [x] T2-7: validateSubQuest Server Action 🟢 ✅ (Session 10) (MVP: code_entry + physical_action)
**Deps:** T0-3
**Context:** `actions/validateSubQuest.ts` (specs.md §3). Chọn quest theo **weekday tính bằng SQL theo `venue.timezone`** (KHÔNG `new Date().getDay()`).
**Impl:** RPC `validate_sub_quest` gói weekday + chọn quest theo input (answer→code_entry / confirmed→physical_action) + verify + UPDATE (atomic, Inv #1/#2). `code_entry` verify `crypt(lower(btrim(answer)),hash)=hash` (**pgcrypto** — khỏi dep node, không lộ đáp án). Action map: pass→`{ok,valid:true}`, mã sai→`{ok,valid:false}` (thử lại), lỗi cứng→`{ok:false}`. **Docker SQL 8/8 PASS** (verify bcrypt thật).
**Checklist:**
- [x] Weekday: `EXTRACT(DOW FROM (NOW() AT TIME ZONE venue.timezone))` → match `active_weekdays`
- [x] `code_entry`: verify hash `crypt(lower(btrim(answer)),hash)` (pgcrypto thay `bcrypt.compare`) — KHÔNG trả đáp án về client
- [x] `physical_action`: `confirmed === true`
- [x] Valid → `UPDATE focus_sessions SET sub_quest_passed=TRUE, sub_quest_response=$answer`
- [x] Không có quest cho hôm nay → lỗi rõ ràng (`NO_QUEST_TODAY`)
- [ ] (🟡 numeric_range/observation/free_text: để TODO, chưa làm MVP)

---

## Phase 3 — Claim & Voucher

### [x] T3-1: CLAIM button logic ✅ (Session 16)
**Deps:** T2-1
**Context:** Hiện CLAIM khi `claim_window_open=true` **và** `sub_quest_passed=true`. Expired khi `claim_window_expired=true`.
**Impl:** Pure `deriveClaimView(status, passed)` → `CLAIM|NEED_QUEST|EXPIRED|NONE` (lib/sessionStatus, test offline 6 nhánh) + `ClaimPanel.tsx` render 3 view (nút CLAIM amber to/nổi bật / nhắc Blind Box / hết hạn+landing). `passed`=effective (server || optimistic localPassed). `onClaim` để TRỐNG (seam T3-2..T3-4; bấm → "đang chuẩn bị"). Mock dev `?passed=1` verify nút CLAIM offline. Render thật mock=2750&passed=1→CLAIM, mock=2750→NEED_QUEST, mock=3000→EXPIRED đều 200.
**Checklist:**
- [x] CLAIM chỉ hiện đúng window 45–48' (server field) và đã pass quest
- [x] Chưa pass quest trong window → nhắc hoàn thành Blind Box
- [x] Expired sau 48': message + link landing
- [x] Nút to, nổi bật (CTA quan trọng nhất)

### [x] T3-2: GPS coordinate capture ✅ (Session 17)
**Deps:** T3-1
**Context:** `getCurrentPosition({enableHighAccuracy:true, timeout:10000})`. OK → claimVoucher. Fail → T3-3.
**Impl:** Lõi injectable `lib/geolocation.ts` — `getPosition(geo, GEO_OPTIONS)` → `GeoResult` (luôn resolve, không reject) + `classifyGeoError` (1/2/3→DENIED/UNAVAILABLE/TIMEOUT) + `ACCURACY_WARN_M=100` (test offline 9 nhánh). ClaimPanel nút CLAIM → state machine idle→locating→located|geo_error: located gọi `onLocated({lat,lng})` (seam T3-4, accuracy>100m vẫn tiếp tục + cảnh báo); geo_error message thân thiện + "Thử lại" + chỗ ráp bypass (T3-3). KHÔNG lưu toạ độ (dùng rồi discard).
**Checklist:**
- [x] Loading "Đang lấy vị trí..."
- [x] Timeout 10s
- [x] PERMISSION_DENIED / TIMEOUT / UNAVAILABLE → fallback T3-3
- [x] accuracy > 100m → warning nhưng vẫn tiếp tục

### [x] T3-3: Manual bypass fallback 🟢 (MVP: static code) ✅ (Session 18)
**Deps:** T3-2
**Context:** GPS fail → nhập mã → validate `CASHIER_BYPASS_CODE` (constant-time). 🟡 Fast-follow: thay bằng OTP động (specs.md §4 Module 3).
**Impl:** `lib/bypass.ts` — `safeEqual(a,b)` constant-time (SHA-256 cả hai → `timingSafeEqual` → length-safe, không throw/leak; test offline 4 nhánh). `actions/verifyBypass.ts` (`"use server"`) so env `CASHIER_BYPASS_CODE` (server-only) → `{ok,valid}` (mã sai/rỗng=valid:false; chưa set env=SERVER_ERROR; test offline 3 nhánh). ClaimPanel nhánh `geo_error` → `<BypassForm>` (input + Xác nhận) → `onBypass`; đúng → state `bypass_ok` (seam T3-4); sai HOẶC lỗi → cùng message "Mã không đúng, thử lại nhé" (không reveal). Mock dev "1234". ⚠️ T3-4 phải RE-CHECK mã server-side (không tin client).
**Checklist:**
- [x] Fallback UI rõ ràng, không gây bực bội
- [x] Server so sánh env var bằng constant-time (chống timing attack)
- [x] Mã sai → lỗi thân thiện, không reveal lý do

### [x] T3-4: claimVoucher Server Action (qua RPC claim_voucher) ✅ (Session 19)
**Deps:** T0-3, T3-2, T3-3
**Context:** `actions/claimVoucher.ts` (specs.md §2 + §4 Module 3). Action: validate presence (Haversine GPS **hoặc** bypass) → gọi **RPC `claim_voucher`** (nơi nguyên tử: re-check window SQL, gate sub_quest, cấp voucher, COMPLETED). KHÔNG tự tính thời gian bằng Date.now().
**Impl:** `lib/haversine.ts` (pure, test 5 điểm biết trước) + `lib/claim.ts` (shared types ClaimPresence/ClaimVoucherResult). `actions/claimVoucher.ts` (`"use server"`): `verifyPresence` (bypass re-verify `safeEqual` / GPS Haversine ≤ `venue.radius_meters`, toạ độ discard) → RPC `claim_voucher` → map lỗi. ClaimPanel rewrite: idle→locating→claiming→claimed (mã voucher) | need_bypass (GPS lỗi/ngoài radius → form mã) | claim_error. SessionView wire `onClaim` (real/mock demo). **Live race test 2 request → 1 voucher + COMPLETED + idempotent PASS.**
**Checklist:**
- [x] Haversine trong `lib/haversine.ts` + test điểm biết trước
- [x] Presence: GPS trong radius HOẶC bypass code hợp lệ
- [x] Gọi RPC `claim_voucher` — không BEGIN/COMMIT thủ công ở Node
- [x] Idempotent: session đã có voucher → trả lại code cũ (RPC lo)
- [x] Map error RPC: SESSION_NOT_RUNNING / QUEST_NOT_PASSED / OUTSIDE_WINDOW / POOL_EMPTY → message thân thiện
- [x] **Test race: 2 request đồng thời cùng session → đúng 1 voucher**

### [x] T3-5: Voucher display screen ✅ (Session 20)
**Deps:** T3-4
**Context:** Success screen, voucher code to dạng coupon. Lưu sessionStorage.
**Impl:** `lib/voucher.ts` (pure read/write `claimed_voucher`, test offline 3 nhánh) + `VoucherScreen.tsx` (coupon mono text-3xl, viền dashed + "lỗ vé", CTA "Thử lại ngày mai"). SessionView: state `claimedVoucher` (restore từ sessionStorage khi mount, non-mock) + render ƯU TIÊN CAO NHẤT (trước cả COMPLETED → reload phiên đã xong vẫn hiện mã, không phải màn trống); `handleClaimed` lưu + setState. ClaimPanel claim ok → `onClaimed(code)`. Mock dev `?voucher=<code>`.
**Checklist:**
- [x] Code font lớn, monospace, dễ đọc, design ticket/coupon
- [x] Lưu `claimed_voucher` sessionStorage, restore khi reload
- [x] CTA "Thử lại ngày mai"

---

## Phase 4 — POS Validation

### [x] T4-1: Cashier validation page ✅ (Session 21)
**Deps:** T0-1
**Context:** `app/validate/page.tsx`. Mobile-first. Input lớn + nút VALIDATE.
**Impl:** `lib/voucherValidation.ts` (types `ValidateVoucherResult`/4 status + `describeVoucherResult` pure→banner tone + `mockValidateVoucher`, test offline 5). `app/validate/page.tsx` (server shell + metadata). `app/_components/Validate.tsx` (client, mobile-first max-w-md): input mã text-2xl mono + autoCapitalize + Enter-submit, nút KIỂM TRA to; banner 4 trạng thái (ok/warn/error tone) + giờ REDEEMED; tự clear input sau kiểm tra. MOCK-FIRST: `runValidate = mockValidateVoucher` → T4-2 thay bằng `validateVoucher` action.
**Checklist:**
- [x] Input + button đủ lớn trên mobile
- [x] Hiện: ✅ Hợp lệ 10% Off | ❌ Chưa claim | ⚠️ Đã dùng | ❌ Không hợp lệ
- [x] Tự clear input sau validate

### [x] T4-2: validateVoucher Server Action ✅ (Session 22)
**Deps:** T0-3, T4-1
**Context:** `actions/validateVoucher.ts` (specs.md §4 Module 4). UPDATE REDEEMED atomic.
**Impl:** RPC `validate_voucher(p_code, p_venue_id)` (schema.sql): UPDATE REDEEMED WHERE RESERVED+chưa hết hạn RETURNING → FOUND='VALID'; 0 dòng → truy vấn phụ (không tồn tại/hết hạn→INVALID · AVAILABLE→NOT_CLAIMED · REDEEMED→USED+redeemed_at). 1 RPC atomic chống double-redeem race. `actions/validateVoucher.ts` (`"use server"`) normalize trim+UPPER + venue env → map `ValidateVoucherResult`. Validate.tsx `runValidate=validateVoucher`. **Docker SQL test 6 nhánh ALL PASS** (gồm double-redeem); live race probe-skip tới khi apply schema. ⚠️ **schema.sql đổi → user apply lại Supabase.**
**Checklist:**
- [x] UPDATE ... WHERE status='RESERVED' AND expires_at>NOW() RETURNING → 1 dòng = ✅
- [x] 0 dòng → phân biệt AVAILABLE / REDEEMED / không tồn tại-hết hạn
- [x] Atomic, chống double-redeem race

---

## Phase 5 — Polish

### [x] T5-1: Session resume khi reload ✅ (Session 23)
**Deps:** T1-2, T2-2
**Context:** Load /session → check sessionStorage → gọi API → tiếp tục đúng phase. Không tạo session mới.
**Impl:** `lib/sessionStore.ts` (pure read/write `session_id`, test offline 3). `ResumeGate.tsx`: /session KHÔNG `?id=` → đọc sessionStorage → `router.replace('/session?id=<id>')` (resume, không tạo mới) / không có → landing. page.tsx: id sai định dạng→redirect landing; id vắng→`<ResumeGate>`; id hợp lệ→SessionView (như cũ). SessionView lưu `session_id` mỗi khi mount (resume sau). Landing dùng chung helper. RUNNING→poll resume phase · COMPLETED→VoucherScreen (claimed_voucher) hoặc "Đã hoàn thành" · EXPIRED→message+landing (có sẵn T2-2/T3-5).
**Checklist:**
- [x] Refresh → tiếp tục đúng phase, không mất tiến độ
- [x] RUNNING → resume | COMPLETED → /claim | EXPIRED → landing + message

### [x] T5-2: Edge case messages ✅ (Session 24)
**Deps:** T3-4, T1-2
**Impl:** Gom 3 message biên vào `lib/messages.ts` (MESSAGES, 1 nguồn sự thật) + wire: Landing RATE_LIMITED→`rateLimited`; ClaimPanel POOL_EMPTY→`poolEmpty` + view NEED_QUEST→`questNotPassedInWindow`. Test regression 3. (Cả 3 đã hiện hữu từ T1-3/T3-1/T3-4 — T5-2 centralize + thống nhất giọng.)
**Checklist:**
- [x] Rate limit: "Bạn đã hoàn thành challenge hôm nay. Quay lại ngày mai!"
- [x] Pool empty: "Hết voucher hôm nay. Hỏi nhân viên để được hỗ trợ."
- [x] Quest chưa pass khi tới window: nhắc quay lại Blind Box

### [x] T5-3: Loading + error states ✅ (Session 25)
**Deps:** Tất cả task trên
**Impl:** `app/loading.tsx` (spinner animate-spin route-level) + `app/error.tsx` (`"use client"` error boundary {error, reset} → màn thân thiện + nút "Thử lại" gọi reset() + link landing, log error useEffect). Defensive try/catch ở ClaimPanel `runClaim` (onClaim không reject nhưng phòng). Audit: mọi action có try/catch, fetch poll/infraction có catch → không unhandled rejection.
**Checklist:**
- [x] `app/loading.tsx` (spinner/skeleton)
- [x] `app/error.tsx` với nút retry
- [x] Không unhandled promise rejection

### [x] T5-4: Smoke test end-to-end ✅ (Session 26) — 🎉 ĐÓNG MVP 25/25
**Deps:** Tất cả task trên
**Impl:** `test/e2e.test.ts` — 1 test gộp LIVE: START (createSession) → Blind Box (mã sai→valid:false, "1234"→valid:true + DB sub_quest_passed) → backdate Giờ Vàng → claimVoucher GPS toạ độ venue → voucher OPR-… → POS redeem VALID + lần 2 USED (double-block; chỉ chạy nếu validate_voucher applied, chưa thì diagnostic). + FE render smoke 10 route/phase. + POS Docker 6/6.
**Checklist:**
- [x] QR → landing < 3s (`/` static 200)
- [x] START → session tạo trong DB (E2E live ✓)
- [x] Phase transitions đúng thời điểm (render mock 120/1500/2200/2750/3000 + derivePhase biên)
- [x] Blind Box: nhập mã đúng/sai hoạt động (E2E: 0000→false, 1234→true)
- [x] GPS claim hoạt động (toạ độ thật) + manual bypass (E2E GPS + safeEqual/verifyBypass)
- [x] Voucher hiển thị đúng (VoucherScreen render + E2E code OPR-…)
- [x] POS validate ✅ và double redemption bị block ❌ (Docker 6/6 + validateVoucher test + E2E redeem)

---

## Fast-follow 🟡 — TRƯỚC khi onboard quán TRẢ PHÍ (không thuộc MVP pilot)

> Schema đã sẵn sàng (specs.md §1 đã có cột/bảng). Đây là phần code bật lên sau pilot.

- `[ ]` **TF-1:** OTP bypass động — `generateBypassOTP` (`crypto.randomInt`, TTL 5', single-use, gắn session_id); thay static `CASHIER_BYPASS_CODE`. (specs.md §4 Module 3)
- `[ ]` **TF-2:** Rate-limit 3 lớp — device fingerprint (SHA-256) + IP + `device_daily_limits`. (specs.md §4 Module 1)
- `[ ]` **TF-3:** Cron job — dọn phiên EXPIRED hằng giờ + alert khi kho voucher < 20.
- `[x]` **TF-4:** RLS multi-tenant — bật `focus_sessions`/`vouchers`/`venues` với CẢ policy anon-insert + venue-isolation + venue-update-by-admin (specs.md §5). ✅ Session 31
- `[ ]` **TF-5:** Blind Box 3 loại còn lại — `numeric_range`, `observation`, `free_text` trong validateSubQuest.

---

## V2 🔵 — sau khi pilot validate xong

- `[x]` **TV2-1:** Admin base — Supabase Auth (email/password) + multi-venue + invite flow. ✅ Session 32
  - `lib/adminSupabase.ts` (createAuthServerClient/createAuthBrowserClient via @supabase/ssr)
  - `middleware.ts` (session refresh + /admin route protection)
  - `actions/adminAuth.ts` (signIn/signOut/signUp/inviteManager)
  - `app/admin/auth/callback/route.ts` (exchange code + link supabase_uid)
  - `/admin/login` · `/admin/register` · `/admin/dashboard`
  - `supabase/schema.sql`: venue_admin_users — composite UNIQUE (venue_id,uid) + (venue_id,email), supabase_uid nullable, migration idempotent
  - 96 tests PASS
- `[x]` **TV2-10:** Venue location UI — `/admin/venue/location`: lấy GPS tại quán (1 click) hoặc nhập tay lat/lng + radius_meters → `updateVenueLocation` Server Action → hiệu lực ngay cho guest claim. Deps: TF-4 + TV2-1. (specs.md §4 Module 5). ✅ Session 33
  - `lib/venueLocation.ts` (pure `validateLocationInput` biên lat/lng/radius) + `actions/updateVenueLocation.ts` (session → validate → ownership `venue_admin_users` → UPDATE qua `createAdminClient`)
  - `app/admin/venue/location/page.tsx` (server: fetch venue user) + `app/_components/VenueLocationForm.tsx` (client: GPS 1-click `getPosition` + manual + radius) + link từ Dashboard
  - KHÔNG đổi schema (venues + RLS `venue_update_by_admin` đã có từ TF-4). 108 tests PASS · tsc/lint/build clean → ADR-011

- `[x]` **TV2-11:** Design system foundation + restyle đồng bộ (RQ-002 · đợt α) — specs §9 ✅ Session 35
  **Deps:** TV2-1, TV2-10. **Context:** token hoá màu (CSS vars→Tailwind) + font, restyle CẢ guest+admin+POS về 1 tông "Cozy Cafe" (default). Giải quyết "không đồng bộ". KHÔNG đổi schema. → ADR-012
  - [x] `globals.css`: design token CSS vars `:root` **kênh-RGB** (primary/accent + fg/deep · bg/surface/text/muted/border · success/warn/error) — default Cozy Cafe (teal `#0F766E` + amber `#F59E0B`); bỏ Arial
  - [x] `tailwind.config.ts`: map `colors.{background,foreground,primary{,fg,deep},accent{,fg},surface,muted,border,success,warn,error}` → `rgb(var(--color-*) / <alpha-value>)` (opacity-modifier OK)
  - [x] Font: **giữ Geist self-host** (đã có, hỗ trợ tiếng Việt) + áp lên `body` qua `var(--font-geist-sans)` — *lệch checklist: KHÔNG thêm Be Vietnam Pro để tránh fetch font sau proxy (ADR-007)/thêm dep; swap sau = 1 dòng body font-family*
  - [x] Restyle guest: Landing/SessionView/BlindBox/ClaimPanel/Meditation/VoucherScreen/ResumeGate → token (gradient Shell dùng `rgb(var(--color-primary))`/`-deep`, amber→accent)
  - [x] Restyle admin: Login/Register/Dashboard/VenueLocationForm + 4 pages → token (bỏ hết `bg-blue-600`/gray)
  - [x] Restyle POS `/validate` + `error.tsx`/`loading.tsx` → token trung tính tương phản cao
  - [x] Pha 3 Meditation giữ dark/tĩnh (Shell teal gradient, nội dung không theo theme)
  - [x] `npm test` **108/0/0** · tsc/lint/build clean · **render thật**: admin+POS dùng `bg-primary/bg-background/...`, CSS bundle có `--color-primary:15 118 110` + `var(--font-geist-sans)`, mọi route 200/307 đúng

- `[x]` **TV2-12:** Theme presets + resolver (RQ-002 · đợt β) — specs §9.3/§9.4/§9.5 ✅ Session 36
  **Deps:** TV2-11. **Context:** `lib/theme.ts` 4 preset + `resolveTheme(theme_id)`→CSS vars; guest áp theme của venue (`branding.theme_id`). KHÔNG đổi schema (branding JSONB sẵn).
  - [x] `lib/theme.ts` (pure): `Theme` {id,name,mascot,primary,primaryFg,primaryDeep,accent,accentFg} (kênh RGB) + `THEMES` 4 preset (`cozy_cafe` default · `cat_cafe` · `book_acoustic` · `lofi_night`) + `resolveTheme`/`isValidThemeId`/`themeCssVars` — 7 test offline
  - [x] `lib/branding.ts`: `Branding` = {themeId, challengeName} (bỏ primaryColor/accentColor — custom-color defer V-sau); `parseBranding` đọc `theme_id` (fallback cozy_cafe) + `brandingCssVars`/`brandingMascot`
  - [x] Guest root áp `--color-*` SSR no-flash: `Landing` (main style) + `session/page` (wrapper div) từ `venue.branding.theme_id`; `lib/venueBrandingServer.ts` (extract getBranding dùng chung)
  - [x] mascot emoji theo theme ở Landing + token classes (bỏ inline hex cũ)
  - [x] Test: `resolveTheme` mọi id+unknown · `themeCssVars` · `parseBranding` theme_id; **118/0/0** · tsc/lint/build clean · **render thật**: Landing inline `--color-primary:15 118 110`+`--color-accent`+☕, `/session` wrapper `--color-primary`+`-deep`

- `[x]` **TV2-13:** Admin theme picker UI (RQ-002 · đợt γ) — specs §4 Module 6 ✅ Session 37 → **đóng RQ-002**
  **Deps:** TV2-12. **Context:** `/admin/venue/theme` chọn preset + preview → `updateVenueTheme` (ownership ADR-011) → lưu `branding.theme_id`, hiệu lực ngay.
  - [x] `actions/updateVenueTheme.ts` (`"use server"`): session → validate `venue_id` UUID + `theme_id` ∈ whitelist (`isValidThemeId`, không tin client) → ownership `venue_admin_users` (owner|manager) → đọc branding → merge `{...branding, theme_id}` (giữ challenge_name…) qua `createAdminClient()`
  - [x] `app/admin/venue/theme/page.tsx` (server: fetch venue + `parseBranding` theme hiện tại, redirect khi chưa login) + `app/_components/VenueThemeForm.tsx` (client: lưới 4 card preset swatch+mascot + **live preview** mockup điện thoại đổi realtime, `useFormState`)
  - [x] Link "🎨 Chọn theme" từ Dashboard (cạnh "📍 Cấu hình vị trí")
  - [x] Test 5 (whitelist + structural action/page/form/dashboard-link); `npm test` **123/0/0** · tsc/lint/build clean · render thật `/admin/venue/theme` → 307 guard

- `[x]` **TV2-14:** Map picker cho venue location (RQ-003) — specs §4 Module 5 ✅ Session 38
  **Deps:** TV2-10. **Context:** bản đồ tương tác chọn toạ độ thay vì gõ tay. Leaflet + OSM (KHÔNG API key) + search Photon + vòng tròn bán kính. KHÔNG đổi schema/backend (lưu vẫn qua `updateVenueLocation`).
  - [x] `lib/geosearch.ts` (pure): `photonSearchUrl` + `parsePhotonResults` (GeoJSON [lng,lat]→list) — test offline
  - [x] `app/_components/MapPicker.tsx` (client): leaflet nạp động + OSM tiles + ghim kéo được (divIcon 📍 tránh bug asset) + click→onPick + `L.circle` bán kính + ô tìm địa chỉ Photon (debounce 400ms, dropdown)
  - [x] `VenueLocationForm.tsx`: `dynamic(()=>import('./MapPicker'),{ssr:false})` (leaflet cần window) + wire `onPick`→setLat/setLng (2 chiều với ô số); giữ GPS + nhập tay fallback
  - [x] Dep `leaflet@1.9` + `@types/leaflet`. `npm test` **129/0/0** (+6) · tsc/lint/build clean · render thật: leaflet lazy-chunk+CSS bundled, route 307 guard. → ADR-013

- `[x]` **TV2-2:** Analytics funnel — phễu chuyển đổi cho admin ✅ Session 39
  **Deps:** TV2-1, TF-4. **Context:** `/admin/venue/analytics` hiển thị phễu Bắt đầu→Qua Blind Box→Nhận voucher→Dùng tại quán + tỉ lệ chuyển đổi + breakdown trạng thái + pool voucher. **Suy số liệu từ `focus_sessions`+`vouchers`** (count queries) — KHÔNG bảng event-log, KHÔNG đổi schema. "Phase reach" (đạt Pha 2/3) defer (cần event-log — ADR-014). → ADR-014
  - [x] `lib/analytics.ts` (pure): `pct` (chia-0→0), `buildFunnel` (4 bước + pctOfStart/pctOfPrev), `conversionRate`, `totalVouchers` — 8 test offline mọi biên
  - [x] `app/admin/venue/analytics/page.tsx` (server): session-guard redirect → ownership `venue_admin_users` → 9 count query song song (`count:'exact', head:true`) qua `createAdminClient` → `buildFunnel`
  - [x] `app/_components/AnalyticsDashboard.tsx` (presentational): stat cards + funnel bars (width=pctOfStart) + breakdown trạng thái phiên; empty-state khi 0 phiên
  - [x] Link "📊 Thống kê" từ Dashboard (cạnh "📍 Cấu hình vị trí" / "🎨 Chọn theme")
  - [x] Test 10 (8 pure + 2 structural page/component + dashboard-link); `npm test` **139/0/0** (+10) · tsc/lint/build clean · render thật `/admin/venue/analytics` → 307 guard
- `[V2]` **TV2-3:** Interactive Sudoku — Phase 1 chơi được
- `[V2]` **TV2-4:** i18n — `vi-VN` + `en-US`
- `[V2]` **TV2-5:** Multi-venue UI — chọn venue từ danh sách
- `[V2]` **TV2-6:** Dev time-compression — nén session để test nhanh
- `[V2]` **TV2-7:** GPS anomaly detection nâng cao
- `[V2]` **TV2-8:** PWA manifest — offline, Add to Home Screen
- `[V2]` **TV2-9:** POS REST API + `pos_api_key` (Gói Chain — KiotViet/Sapo)
