# ADR.md — Architecture Decision Records
# Off-Phone Rewards · Quyết định kỹ thuật quan trọng

> Đọc file này khi: thiết kế tính năng mới, debug hành vi bất ngờ, onboard người mới.
> Mỗi ADR = 1 quyết định không hiển nhiên + lý do + hệ quả.
> KHÔNG ghi lại quyết định hiển nhiên (dùng TypeScript, dùng Tailwind…).

---

## ADR-001 — Scope = Hybrid: schema đầy đủ ngay, code pilot tinh gọn
**Ngày:** 2026-06-03 (Session 0)
**Quyết định:** Dựng schema 6 bảng đầy đủ (kể cả cột 🟡🔵 chưa dùng) ngay từ đầu. Code chỉ làm 🟢 MVP. Hardening nâng cao (OTP động, 3-lớp rate-limit, RLS, cron) defer sang Fast-follow.
**Lý do:** Rename/migrate schema sau khi có dữ liệu thật tốn công gấp đôi. Dựng đúng tên ngay từ đầu không có chi phí bổ sung. Ngược lại, code hardening làm sớm trước khi validate product = lãng phí.
**Hệ quả:** Schema `supabase/schema.sql` có cột/bảng chưa dùng (device_fingerprint, bypass_otps, device_daily_limits, venue_admin_users) — đây là chủ đích, không phải dead code.

---

## ADR-002 — specs.md thắng PRD khi lệch nhau (phần kỹ thuật)
**Ngày:** 2026-06-03 (Session 0)
**Quyết định:** `specs.md` là hợp đồng kỹ thuật DUY NHẤT. `off-phone-rewards-PRD-v3.1.md` chỉ là north star sản phẩm. Khi hai file lệch → specs.md thắng ở phần kỹ thuật.
**Lý do:** PRD viết pseudo-code có bug (race condition, Date.now(), BEGIN/COMMIT pooler). Đã sửa hết vào specs.md (xem D-006..D-010 trong HISTORY). Không thể để PRD override specs đã sửa.
**Hệ quả:** Khi thêm tính năng mới, CẬP NHẬT specs.md (không chỉ PRD). BACKLOG.md → specs.md là luồng bắt buộc.

---

## ADR-003 — supabase-js không cần port 6543 (pooler chỉ cho kết nối Postgres trực tiếp)
**Ngày:** 2026-06-04 (Session 2)
**Quyết định:** `lib/supabase.ts` KHÔNG nhận port hay connection string. supabase-js gọi PostgREST qua HTTPS (URL + key).
**Lý do:** Supavisor 6543 (transaction pooler) chỉ áp dụng khi kết nối Postgres trực tiếp (psql/Prisma/migrations). supabase-js tự xử lý qua PostgREST/HTTPS. Pooler-safe được thoả qua Invariant #2 (logic đa bước = 1 RPC). Ghi rõ trong `lib/supabase.ts`.
**Hệ quả:** Nếu sau này thêm migration script/seed script kết nối Postgres trực tiếp → connection string PHẢI dùng port 6543. supabase-js không cần.

---

## ADR-004 — Test runner = node:test + tsx (không Jest/Vitest)
**Ngày:** 2026-06-04 (Session 2)
**Quyết định:** Dùng Node.js built-in `node:test` + `tsx` loader. Không thêm Jest/Vitest.
**Lý do:** Nhẹ, không dependency bổ sung, đủ cho cả unit (pure logic) lẫn integration (live RPC). tsx giải quyết import extensionless TypeScript.
**Hệ quả:** (1) Mọi test trong `test/**/*.test.ts`. (2) Import PHẢI là relative (`../lib/x`) — alias `@/` không hoạt động dưới tsx. (3) Luôn chạy `npm test` (đã có `--import tsx`), đừng `node --test` trần.

---

## ADR-005 — Rate-limit theo ngày địa phương venue.timezone (không UTC)
**Ngày:** 2026-06-04 (Session 6)
**Quyết định:** `create_session` RPC rate-limit theo `completed_at AT TIME ZONE venue.timezone`, không `CURRENT_DATE` (UTC).
**Lý do:** UTC đổi ngày lúc 7h sáng giờ Việt Nam → khách bị block sai. "1 lần/ngày" phải là ngày địa phương theo múi giờ quán.
**Hệ quả:** Bất kỳ logic "per-day" nào trong tương lai đều phải tính theo `venue.timezone`, không UTC. Pattern: `EXTRACT(DOW FROM NOW() AT TIME ZONE v.timezone)`.

---

## ADR-006 — bcrypt verify bằng pgcrypto trong RPC (không dep node bcryptjs)
**Ngày:** 2026-06-04 (Session 10)
**Quyết định:** `validate_sub_quest` RPC dùng `crypt(lower(btrim(answer)), hash) = hash` (pgcrypto) để verify. Không import bcryptjs vào Node.
**Lý do:** Gói toàn bộ weekday-check + select-quest + verify + UPDATE vào 1 RPC atomic (Invariant #1/#2). pgcrypto đã có sẵn trong Supabase (`extensions` schema). Hash `$2a$` tương thích bcrypt.compare nếu cần sau này. Đáp án không rời server.
**Hệ quả:** `SET search_path = public, extensions` PHẢI có trong mọi function dùng pgcrypto (để resolve cả Docker local và Supabase). Seed đáp án = `"1234"` — đổi trước pilot thật (D-002).

---

## ADR-007 — Corporate TLS proxy → NODE_OPTIONS=--use-system-ca (chỉ máy CORP\)
**Ngày:** 2026-06-04 (Session 4)
**Quyết định:** Thêm `--use-system-ca` vào mọi script Node gọi HTTPS trên máy `CORP\`. Baked-in trong `npm test` và `npm run verify:supabase`. Dùng `$env:NODE_OPTIONS="--use-system-ca"` cho `next dev`/`next start`.
**Lý do:** Proxy doanh nghiệp chèn cert trung gian → Node bundled-CA báo `SELF_SIGNED_CERT_IN_CHAIN`. PowerShell/.NET dùng Windows cert store nên OK. Node 22.15+ hỗ trợ `--use-system-ca`.
**Hệ quả:** Flag này là LOCAL-ONLY — Vercel/Linux không có proxy → không cần. Nếu CI dùng Node <22 thì flag lỗi → xét lại khi đó. Đây là D-016.

---

## ADR-008 — Phase quyết ở server, Date.now() chỉ cho countdown display
**Ngày:** 2026-06-04 (Session 9)
**Quyết định:** `status.phase` luôn lấy từ server poll (`/api/session-status`). `Date.now()` chỉ dùng trong `computeLiveDelta` để tick countdown mượt giữa 2 poll. Mọi quyết định nghiệp vụ theo `delta_seconds` từ Postgres.
**Lý do:** Invariant #1 SERVER TIME. Client clock sai/bị can thiệp → không thể làm cơ sở quyết định phase hay claim window.
**Hệ quả:** Client có thể thấy countdown "không đồng bộ" 1-2s với server → chấp nhận được (chỉ display). Phase chỉ đổi sau poll → có độ trễ tối đa 30s → OK cho UX.

---

## ADR-009 — BlindBox render trong CLAIMABLE khi chưa pass (Session 27)
**Ngày:** 2026-06-05 (Session 27)
**Quyết định:** Khi `phase === "CLAIMABLE"` và `!passed`, render `<BlindBox>` phía trên `<ClaimPanel>` trong `SessionView`. Effect fetch quests trigger thêm cho phase "CLAIMABLE".
**Lý do:** UX gap: người dùng quên Blind Box ở Phase 2 → vào Giờ Vàng → thấy thông báo nhưng không có chỗ nhập. Kết quả: mất voucher dù vẫn trong cửa sổ thời gian.
**Hệ quả:** Logic claim server-side không đổi (RPC vẫn re-check `sub_quest_passed`). UI chỉ cho cơ hội nhập muộn — server là tường chặn cuối cùng.

---

## ADR-010 — dev GPS bypass = NODE_ENV check trong verifyPresence
**Ngày:** 2026-06-05 (Session 27)
**Quyết định:** Thêm `if (process.env.NODE_ENV !== "production") return true;` đầu `verifyPresence` khi test local. Vercel prod không bị ảnh hưởng.
**Lý do:** GPS indoor sai số + không ở gần venue khi dev → cần bỏ qua để test luồng claim. Bypass code cũng được nhưng làm thêm bước UI.
**Hệ quả:** ⚠️ PHẢI XOÁ dòng này trước khi deploy pilot thật. Ghi vào BACKLOG.md pre-pilot checklist.

---

## ADR-011 — Admin mutation: service_role + app-level ownership check (không qua RLS-authenticated)
**Ngày:** 2026-06-05 (Session 33)
**Quyết định:** Mọi Server Action admin ghi dữ liệu (bắt đầu từ `updateVenueLocation`, TV2-10) dùng `createAdminClient()` (service_role, bypass RLS) + tự kiểm tra quyền bằng query `venue_admin_users` (venue_id, supabase_uid = session.user.id). KHÔNG dựa vào RLS policy của authenticated client để enforce quyền.
**Lý do:** (1) Server Action đã chạy server-side an toàn → service_role hợp lý, tránh phải truyền JWT user xuống PostgREST. (2) App-level check tường minh, dễ test/đọc, trả message rõ ("không phải owner/manager venue này"). (3) Khớp specs §4 Module 5 (yêu cầu service_role + check `venue_admin_users`). RLS policy `venue_update_by_admin` (TF-4) vẫn giữ làm **tường phòng thủ thứ hai** cho kết nối authenticated trực tiếp (nếu sau này có).
**Hệ quả:** Bất kỳ admin write nào về sau (branding, sub_quest_config, nạp voucher…) PHẢI tự verify ownership qua `venue_admin_users` trước khi UPDATE — service_role không tự enforce. Quên check = lỗ hổng cross-venue. Owner VÀ manager đều có quyền sửa location (không filter role) theo specs.

---

## ADR-012 — Design tokens = CSS vars kênh-RGB + Tailwind rgb(var() / <alpha-value>)
**Ngày:** 2026-06-05 (Session 35)
**Quyết định:** Màu thiết kế khai báo ở `globals.css :root` dạng **kênh RGB rời** (`--color-primary: 15 118 110`, KHÔNG `#hex`), Tailwind map `colors.* = rgb(var(--color-*) / <alpha-value>)`. Component dùng `bg-primary text-primary-fg text-muted border-border`… thay vì hex cứng / `bg-blue-600`.
**Lý do:** (1) Định dạng kênh-RGB cho phép Tailwind **opacity-modifier** (`text-foreground/60`, `bg-primary/10`) hoạt động đúng — hex var thì `/opacity` sinh CSS không hợp lệ. (2) Vì màu là CSS var ở `:root`, có thể **override lúc runtime** (set `--color-*` trên wrapper) → nền tảng cho TV2-12 áp theme per-venue mà không cần rebuild. (3) 1 nguồn màu duy nhất cho guest+admin+POS → hết tình trạng 3 tông lệch nhau.
**Hệ quả:** Mọi màu mới PHẢI thêm token (kênh-RGB) + map Tailwind, KHÔNG hardcode hex/palette cứng. Guest surface (Landing/Shell) sẽ nhận `--color-*` từ `branding.theme_id` ở TV2-12 (Shell gradient đã dùng `rgb(var(--color-primary))`). **Font:** giữ Geist self-host (đã có, hỗ trợ tiếng Việt) thay vì fetch font mới — tránh tải mạng sau proxy (ADR-007); đổi sang font bo tròn (Be Vietnam Pro…) chỉ cần sửa `body font-family` trong `globals.css`.

---

## ADR-013 — Map picker = Leaflet + OSM (no key) + Photon search, client-only
**Ngày:** 2026-06-05 (Session 38)
**Quyết định:** Chọn toạ độ venue bằng **Leaflet + OpenStreetMap tiles** (TV2-14), KHÔNG dùng Google Maps. Tìm địa chỉ qua **Photon** (komoot, nền OSM). Component `MapPicker` nạp **client-only** qua `next/dynamic({ ssr: false })`; leaflet `import()` động trong `useEffect`. Ghim dùng `divIcon` (📍) thay marker mặc định.
**Lý do:** (1) Leaflet/OSM + Photon **miễn phí, KHÔNG cần API key/billing/GCP setup** → bỏ rào cản onboarding pilot (Google Maps cần key + billing). (2) Leaflet truy cập `window` lúc module-load → static import vỡ SSR/build ⇒ phải dynamic ssr:false + `import('leaflet')` trong effect. (3) Marker mặc định của Leaflet hỏng asset (`marker-icon.png`) dưới webpack ⇒ `divIcon` emoji né hẳn. (4) Tile/search tải ở TRÌNH DUYỆT (Windows cert store) → không vướng corporate proxy như Node SSR-fetch (ADR-007).
**Hệ quả:** Không cần env mới (khác Google). Lưu vẫn qua `updateVenueLocation` cũ — KHÔNG đổi schema/backend; map thuần tầng UI. Photon public có rate-limit (debounce 400ms, ≥3 ký tự). Nếu sau muốn Places-grade search/POI theo tên quán → cân nhắc Google (cần key) hoặc geocoder có key (Geoapify/LocationIQ). Logic search tách `lib/geosearch.ts` (pure) để test offline; phần leaflet (DOM) verify qua build + structural test.

---

## ADR-014 — Analytics = suy từ focus_sessions + vouchers (count queries), KHÔNG event-log
**Ngày:** 2026-06-06 (Session 39)
**Quyết định:** Phễu analytics (TV2-2) **suy trực tiếp** từ dữ liệu sẵn có: 9 `count` query (`count:'exact', head:true`) trên `focus_sessions` + `vouchers` qua `createAdminClient()` (service_role), tính funnel ở `lib/analytics.ts` (pure). **KHÔNG** thêm bảng event-log, **KHÔNG** đổi schema. Funnel = Bắt đầu phiên → Qua Blind Box (`sub_quest_passed`) → Nhận voucher (session `COMPLETED`) → Dùng tại quán (voucher `REDEEMED`).
**Lý do:** (1) Mọi mốc funnel đã có sẵn trạng thái bền vững trong DB (status enum + sub_quest_passed + voucher status) → đếm là đủ cho pilot, không cần instrument thêm. (2) Tránh thêm blocker "apply schema lên Supabase" (đang treo) — analytics thuần app-layer như TV2-10. (3) `head:true` count nhẹ, không kéo row. (4) Logic % tách pure → test offline mọi biên (chia-0).
**Hệ quả:** **"Phase reach" (bao nhiêu phiên đạt Pha 2/Pha 3) KHÔNG đo được** — phase là time-derived (Δt từ `start_time`), không lưu per-session; phiên bỏ dở giữ `RUNNING` tới lazy-expiry nên không biết đã tới pha nào. Muốn đo chính xác cần **event-log** (bảng `session_events` + ghi mốc khi qua mỗi pha) → task V2 riêng lớn hơn. Hiện thay bằng **breakdown trạng thái** (RUNNING/COMPLETED/FAILED/EXPIRED) — đủ thấy chỗ rớt. Số liệu là **snapshot tức thời** (không time-series); muốn xu hướng theo ngày → thêm `GROUP BY date` sau. Khi bật RLS đa-venue, count vẫn đúng vì service_role bypass + page tự lọc theo ownership.

---

## Thêm ADR mới

Format:
```markdown
## ADR-NNN — [Tên quyết định ngắn gọn]
**Ngày:** YYYY-MM-DD (Session N)
**Quyết định:** [Làm gì]
**Lý do:** [Tại sao — ràng buộc, rủi ro đã tránh]
**Hệ quả:** [Ảnh hưởng đến code/process sau này]
```
