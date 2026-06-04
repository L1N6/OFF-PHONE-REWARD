# HISTORY.md — Off-Phone Rewards · Session Log
# Claude đọc file này khi nhận Lệnh 1. Claude ghi vào file này sau Phase D.

═══════════════════════════════════════════════
## 📍 TRẠNG THÁI HIỆN TẠI
═══════════════════════════════════════════════
<!-- Claude cập nhật block này sau MỖI session -->

Cập nhật    : 2026-06-04 (Session 8 — T2-1 Session status API ✅; npm test 24/0/1-skip, build route ƒ, curl 400 OK)
Task đang làm: T2-2 — Session page + Phase 1 UI (deps T2-1 ✓ — buildable, MOCK-FIRST)
Bước tiếp theo: `app/session/page.tsx` — đọc `id` từ URL → poll `/api/session-status?id=` mỗi 30s; countdown = `serverDelta + (Date.now()-fetchTime)/1000` (chỉ để HIỂN THỊ; KHÔNG quyết phase bằng Date.now()); Phase 1 render Sudoku 9x9 tĩnh (hardcode 1 puzzle hợp lệ); `id` không hợp lệ → redirect landing. MOCK-FIRST (Invariant #7) rồi wire API thật.
Task kế tiếp : T2-7 — validateSubQuest (deps T0-3 ✓) — làm song song được
⚠️ Treo: (1) **Apply `supabase/schema.sql` lên Supabase** (thêm `get_session_status`) qua SQL Editor → live RPC test xanh (25/0/0); (2) T0-4 nửa Vercel (🔄 deferred — cần user); (3) D-017 git push blocked. Chi tiết Session 4/8.
MVP tiến độ  : 7 / 25 tasks hoàn thành

═══════════════════════════════════════════════
## TIẾN ĐỘ
═══════════════════════════════════════════════

| Phase | Tasks | Xong | % |
|---|---|---|---|
| Phase 0: Setup | 4 | 3 | 75% |
| Phase 1: Session Auth | 3 | 3 | 100% |
| Phase 2: Timer, Phases & Blind Box | 7 | 1 | 14% |
| Phase 3: Claim & Voucher | 5 | 0 | 0% |
| Phase 4: POS Validation | 2 | 0 | 0% |
| Phase 5: Polish | 4 | 0 | 0% |
| **Tổng MVP** | **25** | **7** | **28%** |

═══════════════════════════════════════════════
## SESSION LOG
═══════════════════════════════════════════════
<!-- Claude THÊM block mới ở đây sau mỗi session. Không xoá session cũ. -->

### Session 0 — 2026-06-03 — Reconcile tài liệu (chưa code)
**Việc:** Đánh giá tài liệu + gộp specs.md ↔ PRD v3.1 thành một nguồn sự thật. **Kết quả:** ✅

**Quyết định kiến trúc (ADR):**
- **Scope = Hybrid:** schema dựng đầy đủ ngay (scale-ready, không rename sau) + Blind Box validation (`code_entry`+`physical_action`) + chống race ở tầng DB. Defer fingerprint/3-layer/OTP động/cron/RLS sang **Fast-follow** (trước quán trả phí).
- **Nguồn sự thật kỹ thuật = `specs.md`** (PRD chỉ là tầm nhìn). Khi lệch → specs.md thắng.
- Thư mục `markdown/` đã được đổi tên thành `docs/` (khớp `@docs/` trong CLAUDE.md). Bản specs.md mới đã hợp nhất vào `docs/`, thư mục `markdown/` lạc đã xoá.

**Files sửa:**
- docs/specs.md — VIẾT LẠI: 1 schema thống nhất (6 bảng, tên chuẩn latitude/longitude/radius_meters, ENUM, JSONB), constraint chống race, function `claim_voucher` pooler-safe, RLS đúng, tag scope 🟢🟡🔵.
- docs/todo.md — 24→25 task; thêm T2-7 validateSubQuest; T0-3 schema đầy đủ + constraints; tách mục Fast-follow.
- docs/CLAUDE.md — thêm "nguồn sự thật" + scope; cập nhật invariants 1/2/6 (SQL weekday, RPC pooler, idempotency tầng DB).
- docs/PLAYBOOK.md — số task 24→25.

**Bug đã sửa trong spec (so với pseudo-code PRD):**
- Cấp 2 voucher/session (idempotency ngoài transaction) → unique index `uniq_voucher_per_session` + RPC `FOR UPDATE`.
- Race tạo 2 phiên RUNNING → unique index `uniq_running_session`.
- `Date.now()` trong claimVoucher + `getDay()` trong validateSubQuest → SQL `NOW()` / `NOW() AT TIME ZONE`.
- `BEGIN/COMMIT` thủ công không hợp pooler → gói vào 1 RPC.
- RLS chặn anon insert → thêm policy `anon_insert_session` + bọc `(SELECT auth.uid())`.

**Task tiếp theo:** T0-1 — Initialize Next.js project
**Bước tiếp theo:** `npx create-next-app@latest --typescript --tailwind --app --eslint`

### Session 1 — 2026-06-03 — T0-1 Initialize Next.js project
**Task:** T0-1 — Initialize Next.js project  |  **Kết quả:** ✅

**Files tạo/sửa:**
- `package.json` — tạo (scaffold), đổi `name` → `off-phone-rewards`. Next 14.2.35, React 18, TS 5, Tailwind 3.4, ESLint 8.
- `app/layout.tsx` — tạo (scaffold), sửa: `metadata` (title/description tiếng Việt), `lang="vi"`. Giữ `next/font/local` (Geist).
- `app/page.tsx` — VIẾT LẠI: bỏ demo boilerplate Next, thay placeholder gọn (chỉ để xác nhận scaffold chạy — landing thật là T1-3).
- `app/globals.css`, `app/fonts/*`, `app/favicon.ico` — scaffold mặc định (giữ).
- `.env.example` — tạo: 5 keys theo CLAUDE.md (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, VENUE_ID, CASHIER_BYPASS_CODE), values trống + chú thích.
- `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`, `next-env.d.ts`, `package-lock.json` — scaffold (giữ nguyên).
- `.gitignore` — GIỮ bản đã cấu hình từ trước (không để scaffold ghi đè); đã đủ node_modules + .env*.local + !.env.example + /.next/ + docs/scratch/*.md.
- `README.md` — giữ bản cũ (không để scaffold ghi đè).

**Test results:**
- `npm run dev` → ✅ Ready 1792ms, `GET / 200`, body chứa "Off-Phone Rewards".
- `npx tsc --noEmit` → ✅ PASS (0 lỗi).
- `npm run lint` → ✅ No ESLint warnings or errors.

**Quyết định kỹ thuật (ADR):**
- **Pin Next.js 14 (`create-next-app@14` → 14.2.35)** thay vì `@latest` (Next 15/React 19). Lý do: CLAUDE.md ghi rõ stack "Next.js 14"; todo checklist viết `@latest` là mâu thuẫn → honor hợp đồng CLAUDE.md, tránh mismatch React 19 phải sửa sau (đúng tinh thần ADR "scale-ready, không rename sau"). Ghi nhận khác chữ với todo.
- **Scaffold qua temp `scaffold-tmp/`** rồi move file vào root, KHÔNG chạy in-place. Lý do: `create-next-app` từ chối thư mục đã có `README.md` + `.claude/` (chỉ chấp nhận .git/.gitignore/docs). Cách này giữ nguyên `.gitignore` + `README.md` đã cấu hình, không bị template ghi đè.
- `--no-src-dir` → `app/` ở root (đúng cấu trúc CLAUDE.md), `--import-alias "@/*"`.

**Vấn đề gặp phải:**
- `create-next-app@14 _scaffold` fail: npm cấm tên bắt đầu bằng `_` → đổi `scaffold-tmp`.
- `--skip-install` bị create-next-app@14 bỏ qua (vẫn cài 380 packages). Không sao — đỡ phải `npm install` lại; move cả `node_modules` (cùng ổ D: → rename tức thời).
- IDE báo diagnostic `Cannot find module './globals.css'` ở layout.tsx → **lành tính**: Next cấp type qua `next-env.d.ts`; `tsc --noEmit` PASS, dev compile OK. Không cần xử lý.
- Chưa `git commit` (user chưa yêu cầu). Nhiều file mới đang untracked — commit khi user sẵn sàng: `git add -A && git commit -m "T0-1 done"`.

**Task tiếp theo:** T0-2 — Supabase client setup
**Bước tiếp theo:** `npm install @supabase/supabase-js` → tạo `lib/supabase.ts` export `createPublicClient()` (anon) + `createAdminClient()` (service_role, throw nếu `typeof window !== 'undefined'`, trỏ pooler transaction-mode 6543).

### Session 2 — 2026-06-04 — T0-2 Supabase client setup
**Task:** T0-2 — Supabase client setup  |  **Kết quả:** ✅

**Files tạo/sửa:**
- `lib/supabase.ts` — TẠO: `createPublicClient()` (anon) + `createAdminClient()` (service_role). Admin throw nếu `typeof window !== 'undefined'`. Cả hai dùng `auth: { persistSession:false, autoRefreshToken:false }` (Invariant #3 NO AUTH). Env đọc **trong function** (runtime), throw nếu thiếu key. Comment dài giải thích "pooler 6543".
- `test/supabase.test.ts` — TẠO: 6 test (`node:test`): throw khi thiếu env (×2), throw khi client-side, trả client hợp lệ khi có env (×2, không gọi mạng), + 1 live-connect (skip nếu chưa có creds).
- `package.json` — thêm dep `@supabase/supabase-js@^2.107.0`; devDep `tsx@^4.22.4`; script `"test": "node --import tsx --test \"test/**/*.test.ts\""`.

**Test results:**
- `npm test` → ✅ 5 PASS + 1 SKIP (live-connect, chưa creds).
- `npx tsc --noEmit` → ✅ PASS.
- `npm run lint` → ✅ No ESLint warnings or errors.

**Quyết định kỹ thuật (ADR):**
- **"Pooler 6543" KHÔNG áp dụng trực tiếp cho supabase-js.** supabase-js gọi PostgREST qua HTTPS (chỉ URL + key, không port/connection-string). Pooler transaction-mode (Supavisor 6543) chỉ liên quan kết nối Postgres TRỰC TIẾP (pg/Prisma/migrations). → Yêu cầu pooler-safe được thoả qua **Invariant #2** (logic đa-bước = 1 RPC `claim_voucher`, không BEGIN/COMMIT từ Node). Ghi rõ trong doc của `lib/supabase.ts`. **Hệ quả:** nếu sau này thêm seed/migration script kết nối Postgres trực tiếp → connection string PHẢI dùng port 6543.
- **Env đọc trong function (không module-level).** Đúng cho Vercel serverless + dễ test cả 2 nhánh (có/thiếu env) trong cùng process.
- **Test runner = `node:test` + `tsx` loader** (không Jest/Vitest). Lý do: nhẹ, dùng API chuẩn Node, đủ cho cả unit (Haversine) lẫn integration (race claim) về sau. `tsx` để resolve import extensionless (Node ESM thuần bắt buộc `.ts`; thêm `allowImportingTsExtensions` sẽ phải đổi style import toàn dự án). **Quy ước:** mọi test đặt ở `test/**/*.test.ts`, import **relative** (không alias `@/`).

**Vấn đề gặp phải:**
- `node --test test/` hiểu `test/` là module để chạy → lỗi MODULE_NOT_FOUND. Fix: dùng glob `"test/**/*.test.ts"` (Node tự match).
- Node ESM thuần báo `ERR_MODULE_NOT_FOUND` cho import extensionless `../lib/supabase`. Fix: chạy qua `tsx` loader (`node --import tsx`). → Để session sau không vấp: **luôn chạy test bằng `npm test`** (đã gắn tsx), đừng `node --test` trần.
- Live-connect chưa chạy được (chưa có Supabase project/creds). Test viết sẵn, tự skip; sẽ pass sau khi T0-4 set env. Xem D-014.

**Task tiếp theo:** T0-3 — Database schema + seed (đầy đủ, scale-ready)
**Bước tiếp theo:** Tạo `supabase/schema.sql` (6 bảng + ENUM + unique index `uniq_running_session`/`uniq_voucher_per_session` + index pos/available) + function `claim_voucher` (specs.md §2) + seed 1 venue (`sub_quest_config`: 1 `code_entry` bcrypt + 1 `physical_action`) + 20 voucher `OPR-XXXX-XXXX`.

### Session 3 — 2026-06-04 — T0-3 Database schema + seed
**Task:** T0-3 — Database schema + seed (đầy đủ, scale-ready)  |  **Kết quả:** ✅

**Files tạo/sửa:**
- `supabase/schema.sql` — TẠO: 6 bảng (specs §1) + 2 ENUM + `uniq_running_session` + `uniq_voucher_per_session` + `idx_vouchers_pos`/`idx_vouchers_available` + function `claim_voucher` (specs §2 verbatim) + `CREATE EXTENSION pgcrypto`. Idempotent (DO-block enum, `IF NOT EXISTS`, `CREATE OR REPLACE`). RLS KHÔNG bật (specs §5).
- `supabase/seed.sql` — TẠO: 1 venue UUID cố định `11111111-…-111111111111` (lat/lng HCMC placeholder + timezone + branding + sub_quest_config: `code_entry` answer_hash=bcrypt("1234") qua pgcrypto + `physical_action`) + 20 voucher `OPR-XXXX-XXXX` deterministic (md5). `SET search_path public, extensions` để crypt() resolve cả local lẫn Supabase. `ON CONFLICT DO NOTHING`.
- `supabase/tests/claim_voucher_test.sql` — TẠO: 8 nhánh (SESSION_NOT_FOUND, happy, idempotent, QUEST_NOT_PASSED, SESSION_NOT_RUNNING, OUTSIDE_WINDOW+FAILED, POOL_EMPTY, index-exists), bọc BEGIN/ROLLBACK, ASSERT.

**Test results (chạy thật trên Postgres 16-alpine qua Docker):**
- schema + seed apply → ✅ SCHEMA_OK / SEED_OK.
- Seed verify → ✅ 1 venue, 20 voucher AVAILABLE, bcrypt verify "1234"✓ / "0000"✗.
- `claim_voucher_test.sql` (`psql ON_ERROR_STOP=1`) → ✅ **8/8 PASS**, exit 0, rollback giữ seed.
- **Race thật: 8 claim song song cùng 1 session → cùng 1 code, `vouchers_for_session=1`, session COMPLETED** (chứng minh D-006/D-007 fix dưới tải song song).

**Quyết định kỹ thuật (ADR):**
- **Test trên Postgres 16 (Docker) thay cho "apply Supabase dashboard".** Chưa có Supabase project/creds → dùng container `postgres:16-alpine` (cùng engine Supabase) để apply + test đầy đủ. Apply lên Supabase THẬT là một phần của **T0-4** (lúc tạo project). Xem **D-015**.
- **bcrypt sinh bằng pgcrypto `crypt(answer, gen_salt('bf',10))`** ngay trong seed — KHÔNG cần dep node bcrypt ở T0-3. Hash `$2a$` tương thích `bcrypt.compare` của node (T2-7). Đáp án seed = "1234" (đã verify round-trip). Đổi sang mã thật trước pilot.
- **VENUE_ID cố định `11111111-…-111111111111`** (không random) → gán thẳng vào env, deterministic giữa các môi trường.
- **`SET search_path TO public, extensions`** trong seed: pgcrypto ở `public` (local) / `extensions` (Supabase) → 1 file chạy được cả hai.
- **Seed/test tách file** (`seed.sql`, `tests/claim_voucher_test.sql`) theo convention Supabase; schema.sql chỉ DDL + function.

**Vấn đề gặp phải:**
- Không có psql/supabase-CLI/local-postgres trên máy → dùng Docker (có sẵn) spin `postgres:16-alpine`. Cách chạy lại: `docker run -d --name opr-pg -e POSTGRES_PASSWORD=postgres postgres:16-alpine` → `docker exec -i opr-pg psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/schema.sql` (rồi seed, rồi tests).
- CLAUDE.md vừa thêm mục "Codebase navigation — MANDATORY" yêu cầu MCP codegraph tools (`get_project_summary`…). **Các tool này CHƯA khả dụng trong phiên** → theo mục Fallback dùng Read/Grep. Nếu session sau tool được nạp thì ưu tiên chúng.

**Task tiếp theo:** T0-4 — Vercel deployment
**Bước tiếp theo:** Tạo Supabase project → SQL Editor chạy `supabase/schema.sql` + `supabase/seed.sql` → lấy URL/anon/service_role + connection string pooler 6543 → set env Vercel + `.env.local` → link Vercel auto-deploy main → `npm test` kỳ vọng 6 PASS/0 SKIP (đóng D-014) + kiểm tra schema thật (đóng D-015).

### Session 4 — 2026-06-04 — T0-4 Vercel deployment (nửa Supabase/local — verified)
**Task:** T0-4 — Vercel deployment  |  **Kết quả:** 🔄 (nửa Supabase/local ✅ verified; nửa Vercel DEFERRED — user tạm chưa push/deploy được)

**Bối cảnh:** HISTORY cũ ghi T0-4 "chưa bắt đầu" nhưng thực tế đã xa hơn: Supabase project đã tạo (`.env.local` đủ creds, ref `lcpfzkjovvnihfueewix`), code đã push GitHub main (`9ecb25e`), có sẵn `docs/deploy.md` + `scripts/verify-supabase.mjs`. Session này = làm cho nó CHẠY THẬT + verify, đóng D-014/D-015.

**Files tạo/sửa:**
- `.env.local` — SỬA: `NEXT_PUBLIC_SUPABASE_URL` bỏ đuôi thừa `/rest/v1/` → `https://lcpfzkjovvnihfueewix.supabase.co`. (gitignored — KHÔNG commit/push). **Bug:** supabase-js tự append `/rest/v1/` → URL cũ thành `…/rest/v1/rest/v1/` → mọi query live fail.
- `package.json` — SỬA 2 script: (1) thêm `--use-system-ca` vào CẢ `test` + `verify:supabase` (Node tin Windows cert store qua corporate TLS proxy); (2) thêm `--env-file-if-exists=.env.local` vào `test` để live-connect test thấy creds. **CHƯA commit** (user chưa push được — xem D-017).

**Test results (chạy THẬT — live Supabase + qua corporate network):**
- Apply `schema.sql` + `seed.sql` lên Supabase thật (user tự chạy SQL Editor) → ✅ → **đóng D-015**
- `npm run verify:supabase` → ✅ venue "Off-Phone Pilot Café" (tz Asia/Ho_Chi_Minh) + sub_quest_config (code_entry+physical_action) + **20 voucher AVAILABLE** + RPC `claim_voucher` (trả SESSION_NOT_FOUND đúng kỳ vọng)
- `npm test` → ✅ **6 PASS, 0 SKIP** (live-connect chạy thật 1016ms) → **đóng D-014**
- `npm run build` → ✅ exit 0, "Compiled successfully", route `/` static — Vercel build-ready

**Quyết định kỹ thuật (ADR):**
- **Corporate TLS interception (→ D-016).** Máy `CORP\` sau proxy chèn cert → Node bundled-CA báo `SELF_SIGNED_CERT_IN_CHAIN` (PowerShell/.NET OK vì dùng Windows store). Fix `--use-system-ca` (Node 22.15+; máy Node 24). **Chỉ là vấn đề LOCAL** — Vercel/Linux không có proxy → không cần; gắn vào script ops (KHÔNG phải `next build`) nên vô hại + giúp re-run. Cảnh báo: nếu sau có CI Node <22 thì flag này lỗi → xét lại.
- **`--env-file-if-exists` (KHÔNG phải `--env-file`) cho `test`:** có `.env.local` → live test chạy; không có (CI/teammate) → skip nhẹ nhàng, không crash.
- **Apply schema qua SQL Editor (user làm), KHÔNG qua connection string.** An toàn hơn (không đưa mật khẩu DB vào session); chỉ có API key trong `.env.local` thì không chạy được DDL. User chọn cách này khi được hỏi.
- **Vercel DEFERRED theo yêu cầu user.** Code trên main đã đủ để Vercel build → deploy không cần push thêm; nửa Vercel chỉ là thao tác dashboard (cần tài khoản user).

**Vấn đề gặp phải (để session sau không vấp):**
- `verify:supabase` lần đầu fail `Cannot find package '@supabase/supabase-js'` → `node_modules` chưa cài ở checkout này → `npm install` (391 packages, ~exit 0). **→ Checkout mới phải `npm install` trước.**
- `fetch failed` → chẩn `SELF_SIGNED_CERT_IN_CHAIN`: cách phân biệt = TCP 443 OK + `Invoke-WebRequest` (.NET) OK **nhưng** Node `fetch` fail ⇒ lệch CA store ⇒ `--use-system-ca`.
- `npm test` lần đầu 5 PASS + 1 SKIP (live test skip vì `test` không nạp `.env.local`) → thêm `--env-file-if-exists`.
- `npm run build` có warning `<w>` UNC path `//ucloudnas.corp.lgcns.com/…` (ổ D: là network share) — **LÀNH TÍNH**, build vẫn exit 0, không xảy ra trên Vercel.
- **User chưa push code mới lên GitHub được** (nghi corporate firewall chặn git push) → D-017. KHÔNG block Vercel deploy bản hiện tại (code đã ở main).

**Task tiếp theo:** T0-4 (nốt nửa Vercel) HOẶC T1-1 (useGuestToken — chỉ deps T0-1, làm song song được)
**Bước tiếp theo:** [Vercel, cần user] set 5 env (cả 3 môi trường; URL không `/rest/v1/`) → Redeploy bỏ build-cache → paste Production URL → curl verify → chốt T0-4 ✅. Hoặc bắt đầu T1-1 trước (không phụ thuộc Vercel).

### Session 5 — 2026-06-04 — T1-1 useGuestToken hook
**Task:** T1-1 — useGuestToken hook  |  **Kết quả:** ✅

**Bối cảnh:** T0-4 nửa Vercel kẹt phía user (push/tài khoản) → nhảy sang T1-1 (chỉ deps T0-1, buildable ngay, không phụ thuộc Vercel).

**Files tạo/sửa:**
- `hooks/useGuestToken.ts` — TẠO (`"use client"`): hook `useGuestToken(): {token, isReady}` + pure helper `getOrCreateGuestToken(storage, genId)` (tách lõi để test không cần DOM) + const `GUEST_TOKEN_KEY="guest_token"`. SSR-safe: state init `{null,false}`; `useEffect` (client-only) đọc/sinh token qua `crypto.randomUUID()` rồi set `{token, true}`.
- `test/useGuestToken.test.ts` — TẠO: 4 test (node:test, mock Storage backed bằng Map) — trả token đã có (không regen), sinh+lưu khi rỗng, persist 2 lần→1 token + genId gọi 1 lần, smoke `useGuestToken` là function (xác nhận module + react import load OK).

**Test results:**
- `npm test` → ✅ **10 PASS, 0 SKIP** (6 supabase gồm live 1439ms + 4 guestToken)
- `npx tsc --noEmit` → ✅ 0 errors
- `npm run lint` → ✅ No ESLint warnings or errors

**Quyết định kỹ thuật (ADR):**
- **Tách lõi pure `getOrCreateGuestToken(storage, genId)`** khỏi React → test bằng node:test với mock Storage (Map), KHÔNG cần jsdom/testing-library (giữ triết lý nhẹ T0-2). React wiring (isReady false→true) là pattern chuẩn → smoke-test export là đủ ở tầng này.
- **SSR-safe chống hydration mismatch:** init `{null,false}` (server == client render đầu), `useEffect` mới chạm browser API; guard `typeof window` tường minh dù useEffect vốn client-only.
- **`crypto.randomUUID()`** (Web Crypto, không `Math.random`) — secure context (HTTPS/localhost) có sẵn ở browser hiện đại; Vercel HTTPS OK.
- **react named-import dưới tsx chạy ngay** → không phải tách helper sang file react-free.

**Vấn đề gặp phải:**
- Không có. (Lo ngại CJS interop khi import react dưới tsx → không xảy ra; smoke test xác nhận.)

**Task tiếp theo:** T1-2 — createSession Server Action (deps T0-3 ✓)
**Bước tiếp theo:** `actions/createSession.ts` (specs §4 Module 1) — validate UUID → rate-limit 1/ngày → INSERT NOW() qua `createAdminClient()`; idempotency qua `uniq_running_session` (bắt unique-violation → SELECT phiên cũ). Test race 2 request → 1 session.

### Session 6 — 2026-06-04 — T1-2 createSession Server Action
**Task:** T1-2 — createSession Server Action  |  **Kết quả:** ✅

**Files tạo/sửa:**
- `supabase/schema.sql` — THÊM function `create_session(p_guest_token, p_venue_id)`: rate-limit (1 COMPLETED / token / venue / NGÀY ĐỊA PHƯƠNG theo `venue.timezone`) + resume phiên RUNNING + INSERT `start_time=NOW()`, bắt `unique_violation` → resume. `CREATE OR REPLACE` (idempotent). **User đã apply lên Supabase thật qua SQL Editor** (re-run cả schema.sql, an toàn).
- `lib/uuid.ts` — TẠO: `isValidUuid` (pure regex, mọi version UUID).
- `actions/createSession.ts` — TẠO (`"use server"`): `createSession(guestToken)` → validate UUID → đọc `VENUE_ID` env → `.rpc('create_session')` qua admin client → trả `{ok, sessionId, startTime, resumed}` | `{ok:false, error}`.
- `test/createSession.test.ts` — TẠO: 3 unit offline (isValidUuid ×2 + INVALID_TOKEN path) + 1 **live** (race 2 request→1 session, resume, rate-limit; `TEST_TOKEN` namespaced + cleanup `finally`).

**Test results:**
- `npm test` → ✅ **14 PASS, 0 SKIP** (live race/resume/rate-limit 3806ms chạy thật trên Supabase)
- `npx tsc --noEmit` → ✅ 0 errors · `npm run lint` → ✅ clean · `npm run build` → ✅ exit 0 (`"use server"` action hợp lệ)

**Quyết định kỹ thuật (ADR):**
- **createSession = RPC `create_session`, KHÔNG app-level multi-query.** Rate-limit `completed_at::date` phải tính ở SQL (Invariant #1 cấm `new Date()`); supabase-js không filter `CURRENT_DATE` → gói rate-limit + resume + INSERT vào 1 function (atomic #2, idempotent #6). Cùng pattern `claim_voucher`.
- **Rate-limit theo NGÀY ĐỊA PHƯƠNG `venue.timezone` (`AT TIME ZONE`), KHÔNG `CURRENT_DATE` (UTC)** — sai khác CÓ CHỦ ĐÍCH so với chữ literal spec §4 Module 1: UTC đổi ngày lúc 7h sáng giờ VN → sai cho quán. **User đã được flag + đồng ý giữ.**
- **`venue_id` từ env `VENUE_ID` (không nhận từ client).** VENUE_ID là server-only env → client không có → server-authoritative an toàn hơn. Multi-venue: thêm param ở V2.
- **`isValidUuid` tách `lib/uuid.ts`** (không để trong action): file `"use server"` chỉ được export async function → validator sync phải ở file riêng (constraint Next, đã confirm qua `npm run build`).
- **Action import RELATIVE `../lib/supabase` (không alias `@/`)** — để test chạy dưới tsx (convention T0-2).

**Vấn đề gặp phải (để session sau không vấp):**
- **Docker KHÔNG có ở session này** (Session 3 có) → không test SQL function isolated được → test qua **live Supabase** (user apply function trước). Nếu sau muốn test isolated: cần Docker hoặc embedded-pg.
- **Live test GHI vào DB pilot** (tạo/xoá session `TEST_TOKEN=0a0a…aa` mỗi lần `npm test`) — tự dọn ở `finally`. Nếu test gãy giữa chừng → còn 1 session test (vô hại; lần chạy sau dọn ở đầu test).
- `schema.sql` đã đổi (thêm `create_session`) + đã apply Supabase nhưng FILE **chưa commit** (push blocked — D-017). Commit phải gồm `supabase/schema.sql actions/ lib/ test/`.

**Task tiếp theo:** T1-3 — Landing page (deps T1-1 ✓ + T1-2 ✓)
**Bước tiếp theo:** `app/page.tsx` — copy PRD §1.2; START → `createSession(token)` + unlock AudioContext → sessionStorage → redirect `/session?id=`; áp branding; loading + error (rate-limit/pool-empty). FE wire `createSession` thật (đã build & test).

### Session 7 — 2026-06-04 — T1-3 Landing page
**Task:** T1-3 — Landing page  |  **Kết quả:** ✅  (Phase 1 hoàn tất 3/3)

**Files tạo/sửa:**
- `app/page.tsx` — VIẾT LẠI (Server Component, `export const dynamic="force-dynamic"`): `getBranding()` fetch `venues.branding` qua admin client + fallback `DEFAULT_BRANDING` (try/catch) → render `<Landing branding>`.
- `app/_components/Landing.tsx` — TẠO (`"use client"`): `useGuestToken` + copy PRD §1.2; nút START → `unlockAudio()` (gesture) + `createSession(token)` → sessionStorage (`session_id` + `audio_gesture`) → `router.push('/session?id=')`; loading + error map (RATE_LIMITED/INVALID_TOKEN/SERVER_ERROR); áp branding bằng inline style.
- `lib/branding.ts` — TẠO: `Branding` + `DEFAULT_BRANDING` (khớp seed) + `parseBranding` (JSONB→Branding, fallback field thiếu/sai kiểu). Pure.
- `lib/audio.ts` — TẠO: `unlockAudio()` singleton AudioContext (Invariant #5; module-level → sống qua client-nav) + `getAudioContext`/`isAudioUnlocked` (cho T2-4).
- `test/branding.test.ts` — TẠO: 4 test `parseBranding`.

**Test results:**
- `npm test` → ✅ **18 PASS, 0 SKIP** (4 branding + 14 cũ) · `tsc` 0 · lint clean · `npm run build` → ✅ route `/` = `ƒ` dynamic
- **Render thật:** `next start` → `curl localhost:3000` → **HTTP 200**, HTML đủ copy ("Gác lại mạng xã hội"/"45 phút"/"giảm 10%"/"BẮT ĐẦU"/"Gác Máy 45"/"Không cần đăng nhập") + màu `#0F766E`/`#F59E0B`.

**Quyết định kỹ thuật (ADR):**
- **Server Component fetch branding + fallback (KHÔNG mock cứng).** `force-dynamic` để không gọi DB lúc build. Local dev sau corporate proxy → SSR-fetch fail → default (khớp seed); Vercel → branding thật. parseBranding là unit test được.
- **Tách Server (page) / Client (Landing)** — branding fetch server-side (không lộ admin key, không loading client); tương tác client. Component ở `app/_components/` (folder `_` → Next bỏ khỏi routing).
- **AudioContext singleton module-level** — `router.push` là client-nav (không reload) → unlock ở landing sống sang /session (T2-4). Unlock chỉ trong handler START (Invariant #5).
- **Cờ `sessionStorage.audio_gesture`** cho T2-4 autoplay; `session_id` cho resume (T5-1).

**Vấn đề gặp phải (để session sau không vấp):**
- `next start` Ready mất ~12.6s → curl retry-loop 15s đầu suýt trượt; curl phát 2 mới 200. **→ Chờ "Ready" trong output server trước khi curl.**
- Branding local = default (proxy chặn SSR-fetch) — đúng kỳ vọng; branding THẬT chỉ verify được trên Vercel.
- Đích redirect `/session` CHƯA tồn tại (T2-2) → START xong sẽ 404 tạm; flow createSession/sessionStorage vẫn đúng.

**Task tiếp theo:** T2-1 — Session status API (deps T0-3 ✓, T1-2 ✓)
**Bước tiếp theo:** `app/api/session-status/route.ts` (specs §4 Module 2) — Δt bằng SQL `EXTRACT(EPOCH FROM NOW()-start_time)`; map phase; lazy expiry >2880s → UPDATE EXPIRED; trả `{delta_seconds, phase, status, sub_quest_passed, claim_window_open, claim_window_expired}`; 404 nếu không thấy.

### Session 8 — 2026-06-04 — T2-1 Session status API
**Task:** T2-1 — Session status API  |  **Kết quả:** ✅

**Files tạo/sửa:**
- `supabase/schema.sql` — THÊM function `get_session_status(p_session_id)`: Δt=`FLOOR(EXTRACT(EPOCH FROM NOW()-start_time))` (server time) + lazy-expiry (RUNNING & Δt>2880 → UPDATE EXPIRED, idempotent `WHERE status='RUNNING'`) gói 1 function (atomic, pooler-safe). Trả raw `{out_delta_seconds, out_status, out_sub_quest_passed}`; 0 dòng nếu không thấy. `CREATE OR REPLACE` (idempotent). **CHƯA apply lên Supabase** (cần user SQL Editor — D-017 push blocked).
- `lib/sessionStatus.ts` — TẠO (pure): `derivePhase(Δt)` → `1|2|3|CLAIMABLE|EXPIRED` + `deriveSessionStatus()` gộp `{delta_seconds, phase, status, sub_quest_passed, claim_window_open, claim_window_expired}`. Const biên 900/2100/2700/2880. Không Date.now() → test offline mọi biên.
- `app/api/session-status/route.ts` — TẠO (App Router GET, `force-dynamic`): đọc `?id=` → validate UUID (400) → RPC `get_session_status` qua admin client → 0 dòng=404 → map qua `deriveSessionStatus` → 200 JSON + `Cache-Control: no-store`. 500 khi RPC/exception.
- `test/sessionStatus.test.ts` — TẠO: 6 offline (derivePhase 10 biên + deriveSessionStatus 5 scenario gồm status-gate & expired) + 1 live (probe→skip nếu function chưa apply; 404-path + phiên mới RUNNING + lazy-expiry ghi DB; token `0b0b…bb` tự dọn `finally`).
- `supabase/tests/get_session_status_test.sql` — TẠO: 6 nhánh SQL (not-found, Δt~0, Δt~1000, lazy-expiry+ghi DB, COMPLETED giữ nguyên, sub_quest_passed) bọc BEGIN/ROLLBACK — chạy khi có Docker/psql.

**Test results:**
- `npm test` → ✅ **24 PASS / 0 FAIL / 1 SKIP** (skip = live `get_session_status`, function chưa apply — message actionable). Offline phase-logic 6/6 PASS.
- `npx tsc --noEmit` → ✅ 0 lỗi · `npm run lint` → ✅ clean · `npm run build` → ✅ route `/api/session-status` = `ƒ` dynamic.
- **Render thật:** `next start` + curl → `GET /api/session-status` (no id) & `?id=not-a-uuid` → **HTTP 400** `{"error":"INVALID_SESSION_ID"}` (handler + routing OK end-to-end).

**Quyết định kỹ thuật (ADR):**
- **Tách SQL (atomic, server-time) / Node (pure, testable).** RPC chỉ lo phần BẮT BUỘC ở SQL: Δt từ NOW() (Invariant #1) + lazy-expiry UPDATE (atomic #2). Map phase + claim-window là số học thuần trên Δt-server → đẩy về `lib/sessionStatus.ts` để unit-test MỌI biên offline (không cần DB, không pollute pilot). KHÔNG vi phạm #1: nguồn thời gian vẫn là server-delta; Node không gọi đồng hồ client cho quyết định nghiệp vụ.
- **`claim_window_open` gate thêm `status='RUNNING'`** (ngoài Δt∈[2700,2880]) → phiên đã COMPLETED/EXPIRED không hiện lại nút CLAIM. `claim_window_expired`=Δt>2880 thuần. Quyền claim THẬT vẫn ở RPC `claim_voucher` (re-check SQL) — field này chỉ là gợi ý UI.
- **`phase` kiểu hỗn hợp `1|2|3|'CLAIMABLE'|'EXPIRED'`** đúng literal checklist; consumer `switch(phase)`. `status` (enum DB) tách bạch khỏi `phase` (UI state).
- **Lazy-expiry idempotent qua `WHERE status='RUNNING'`** (không FOR UPDATE) → poll 30s đồng thời an toàn mà không khoá hàng mỗi lần poll (nhẹ cho tần suất cao).
- **Route đọc `?id=`** (khớp `/session?id=` của T1-3). 400 cho id thiếu/sai (chặn DB call vô ích) — ngoài checklist nhưng hợp lý; 404 chỉ cho UUID hợp lệ-nhưng-không-thấy.

**Vấn đề gặp phải (để session sau không vấp):**
- **Docker KHÔNG chạy session này** (như Session 6) → SQL test isolated chưa chạy; đã viết sẵn `get_session_status_test.sql`. Khi có Docker: `docker run -d --name opr-pg -e POSTGRES_PASSWORD=postgres postgres:16-alpine` → apply `schema.sql` → `docker exec -i opr-pg psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/get_session_status_test.sql`.
- **Live RPC test SKIP** vì `get_session_status` chưa có trên Supabase (probe PGRST202 → `t.skip`). **Đóng skip:** user chạy `supabase/schema.sql` (re-run cả file an toàn — idempotent) trong SQL Editor → `npm test` lại → kỳ vọng **25/0/0**. Cùng workflow apply DDL như Session 3/4/6.
- `next start` lần này Ready ~0.8s (warm build) — khác Session 7 (~12.6s cold). curl retry-loop vẫn an toàn.
- File `schema.sql`/`lib`/`app`/`test` mới **chưa commit** (push blocked D-017). Commit gồm: `supabase/schema.sql supabase/tests/ lib/sessionStatus.ts app/api/ test/sessionStatus.test.ts docs/`.

**Task tiếp theo:** T2-2 — Session page + Phase 1 UI (deps T2-1 ✓)
**Bước tiếp theo:** `app/session/page.tsx` — poll `/api/session-status?id=` mỗi 30s + countdown local (`serverDelta + (Date.now()-fetchTime)/1000`, chỉ hiển thị); Phase 1 Sudoku 9x9 tĩnh; `id` sai → redirect landing. MOCK-FIRST (Invariant #7) trước, wire API sau.

═══════════════════════════════════════════════
## LỖI ĐÃ BIẾT (Technical Debt)
═══════════════════════════════════════════════

### Đã giải quyết trong spec (Session 0)
| ID | Vấn đề cũ | Cách xử lý |
|---|---|---|
| ✅ D-006 | claimVoucher cấp 2 voucher/session khi chạy song song | unique index + RPC FOR UPDATE |
| ✅ D-007 | createSession race tạo 2 phiên RUNNING | unique index `uniq_running_session` |
| ✅ D-008 | Date.now()/getDay() vi phạm SERVER TIME | chuyển hết sang SQL NOW() |
| ✅ D-009 | BEGIN/COMMIT không hợp pooler serverless | function `claim_voucher` |
| ✅ D-010 | Schema specs.md ↔ PRD lệch (rename cột khi scale) | 1 schema đầy đủ, tên chuẩn từ đầu |

### Nợ chấp nhận được (MVP pilot)
| ID | Vấn đề | Ảnh hưởng | Kế hoạch |
|---|---|---|---|
| D-001 | guest_token client-side → dễ spam session | Thấp (rate limit + unique index) | TF-2 |
| D-002 | Blind Box code_entry chia sẻ đáp án được | Thấp (rotate theo ngày, voucher nhỏ) | TF-5 |
| D-003 | GPS indoor sai số >20m → false reject | Trung bình (có bypass) | TF-1 |
| D-004 | Bypass code tĩnh dễ lộ | Trung bình (staff có mặt khi pilot) | TF-1 (OTP động) |
| D-005 | Không có admin UI để nạp voucher | Trung bình (kỹ sư nạp tay khi pilot) | TV2-1 |
| D-011 | Chưa có cron dọn EXPIRED + alert kho cạn | Thấp (lazy expiry tạm đủ) | TF-3 |
| D-012 | Chưa bật RLS (chặn admin xem chéo venue) | Thấp khi 1 venue, CAO khi nhiều venue | TF-4 (bắt buộc trước Admin UI) |
| D-013 | HISTORY.md append vô hạn → phình context | Thấp (tăng dần) | Archive khi > ~15 session |
| ✅ D-014 | Live-connect test skip vì chưa có Supabase creds | — | **ĐÓNG (Session 4):** `.env.local` đủ creds + URL sửa + `--env-file-if-exists` → `npm test` **6 PASS, 0 SKIP** |
| ✅ D-015 | Schema/seed chưa apply lên Supabase thật (mới chỉ Docker) | — | **ĐÓNG (Session 4):** user chạy SQL Editor `schema.sql`+`seed.sql`; `verify:supabase` xác nhận venue + 20 voucher + RPC live |
| ✅ D-016 | Corporate TLS proxy → Node fetch `SELF_SIGNED_CERT_IN_CHAIN` (fetch failed) | Local-only (Vercel/Linux không bị) | **ĐÓNG (Session 4):** `--use-system-ca` trong scripts (Node 22.15+). Mọi script Node gọi mạng TRÊN MÁY NÀY cần flag này |
| D-017 | User chưa push code mới lên GitHub được (nghi corporate firewall/proxy chặn git push) | TB — block verify auto-deploy + push T1+. KHÔNG block Vercel deploy bản hiện tại (code đã ở main `9ecb25e`) | Chẩn đoán khi user sẵn sàng: git qua HTTPS proxy? đổi remote sang SSH? credential/PAT? |
