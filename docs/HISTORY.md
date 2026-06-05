# HISTORY.md — Off-Phone Rewards · Session Log
# Claude đọc file này khi nhận Lệnh 1. Claude ghi vào file này sau Phase D.

═══════════════════════════════════════════════
## 📍 TRẠNG THÁI HIỆN TẠI
═══════════════════════════════════════════════
<!-- Claude cập nhật block này sau MỖI session -->

Cập nhật    : 2026-06-05 (Session 25 — T5-3 Loading + error states ✅; npm test **83/0/1**, tsc/lint/build ✅. **Phase 5 = 3/4** — chỉ còn T5-4 smoke test)
Task đang làm: T5-4 — Smoke test end-to-end (deps: tất cả task trên) → task MVP CUỐI CÙNG
Bước tiếp theo: Chạy smoke E2E (ưu tiên qua các test/render đã có + 1 lượt thủ công): QR→landing <3s · START→session tạo DB (createSession live test ✓) · phase transitions (mock=120/1500/2200/2750) · Blind Box nhập đúng/sai (validate_sub_quest test ✓) · GPS claim + bypass (claimVoucher live race ✓) · voucher hiển thị (VoucherScreen render ✓) · POS validate ✅ + double-redeem block ❌ (validate_voucher Docker 6/6 ✓). T5-4 = checklist xác nhận toàn luồng + ghi lại bằng chứng; cân nhắc 1 test E2E gộp (createSession→backdate claimable→claimVoucher→validateVoucher→USED) nếu muốn 1 lượt tự động. **Cần user apply schema.sql (validate_voucher) để chạy live cuối.**
Task kế tiếp : (HẾT MVP 🟢) → Fast-follow 🟡 hoặc deploy pilot
⚠️ Treo: **Commit/push T2-6 + T3-1..T3-5 + T4-* + T5-1..T5-3** (chưa lên GitHub từ `b008e4e` — S15–S25). ⚠️ **schema.sql đổi (validate_voucher) → user APPLY lại Supabase**. (✅ T0-4 live · ✅ D-017.)
MVP tiến độ  : 24 / 25 tasks hoàn thành

═══════════════════════════════════════════════
## TIẾN ĐỘ
═══════════════════════════════════════════════

| Phase | Tasks | Xong | % |
|---|---|---|---|
| Phase 0: Setup | 4 | 4 | 100% |
| Phase 1: Session Auth | 3 | 3 | 100% |
| Phase 2: Timer, Phases & Blind Box | 7 | 7 | 100% |
| Phase 3: Claim & Voucher | 5 | 5 | 100% |
| Phase 4: POS Validation | 2 | 2 | 100% |
| Phase 5: Polish | 4 | 3 | 75% |
| **Tổng MVP** | **25** | **24** | **96%** |

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

### Session 9 — 2026-06-04 — T2-2 Session page + Phase 1 UI
**Task:** T2-2 — Session page + Phase 1 UI  |  **Kết quả:** ✅

**Bối cảnh:** User đã apply `schema.sql` lên Supabase giữa 2 session → live `get_session_status` test giờ PASS (đóng skip Session 8). Commit T2-1 `6178af7` đã có local (push vẫn treo D-017).

**Files tạo/sửa:**
- `app/session/page.tsx` — TẠO (Server, `force-dynamic`): đọc `searchParams.id` → `isValidUuid` sai/thiếu → `redirect('/')`. Mock dev (`?mock=<delta>`, chỉ NODE_ENV≠production) → truyền `mockDelta`. Render `<SessionView>`.
- `app/_components/SessionView.tsx` — TẠO (`"use client"`): poll `/api/session-status?id=` mỗi 30s (`cache:no-store`) + tick 1s; PHASE do server quyết (Invariant #1). 404/400 → `router.replace('/')`; lỗi mạng → giữ poll. Countdown = `computeLiveDelta` (display-only), gate `mounted` chống hydration mismatch. COMPLETED/EXPIRED có màn riêng; phase 2/3/CLAIMABLE = placeholder. Mock dựng status TRONG render → SSR verify được.
- `app/_components/Sudoku.tsx` — TẠO: lưới 9×9 tĩnh (81 ô, border dày biên 3×3). Presentational thuần.
- `lib/sudoku.ts` — TẠO (pure): `SAMPLE_SUDOKU` (puzzle hợp lệ kinh điển) + `isValidSudoku` (check trùng hàng/cột/ô 3×3).
- `lib/sessionStatus.ts` — THÊM `computeLiveDelta(serverDelta, fetchTimeMs, nowMs)` + `formatMMSS` (pure, display-only).
- `test/sudoku.test.ts` — TẠO: 4 test (9×9, hợp lệ, bắt lỗi trùng hàng + trùng ô 3×3).
- `test/sessionStatus.test.ts` — THÊM 2 test (computeLiveDelta + formatMMSS).

**Test results:**
- `npm test` → ✅ **31 PASS / 0 FAIL / 0 SKIP** — gồm **live `get_session_status` giờ PASS** (user đã apply schema; 404 + phiên mới RUNNING + lazy-expiry ghi DB thật trên Supabase).
- `npx tsc --noEmit` → ✅ 0 lỗi · `npm run lint` → ✅ clean · `npm run build` → ✅ route `/session` = `ƒ` (2.06 kB).
- **Render thật (`next dev` + mock):** phase1 `mock=120`→"Pha 1" + **Sudoku 81 ô**; phase2 `mock=1500`→"Pha 2"; claimable `mock=2750`→"Giờ Vàng"; expired `mock=3000`→"hết hạn" — tất cả HTTP 200. Redirect no-id & bad-id → **HTTP 307** về landing.

**Quyết định kỹ thuật (ADR):**
- **Phase do SERVER quyết, Date.now() chỉ cho countdown DISPLAY** (Invariant #1). `status.phase` từ poll; `computeLiveDelta` (pure, nhận `nowMs` tham số) chỉ hiển thị đồng hồ mượt giữa 2 poll. Resync `fetchTime` mỗi poll.
- **Mock dev `?mock=<delta>` tính status THẲNG trong render** (không qua state/effect) → SSR hiển thị → verify offline mọi phase không cần live session (MOCK-FIRST #7). Gate `NODE_ENV≠production` → vô hại prod.
- **Gate `mounted` cho countdown** (render "--:--" tới khi mount) → tránh hydration mismatch (server/client lệch Date.now()).
- **Tách Server page / Client SessionView** (như T1-3): validate+redirect server-side (không flash content); tương tác client.
- **Logic thuần tách `lib/`** (computeLiveDelta/formatMMSS/isValidSudoku) → test offline; React wiring verify qua build + render thật.
- **Phase 2/3/CLAIMABLE = placeholder** (không crash, sẵn cho T2-3/T2-4/T3-1 ráp vào).

**Vấn đề gặp phải (để session sau không vấp):**
- **Mock chỉ chạy `next dev`** (NODE_ENV=development); `next start`/Vercel (production) bỏ qua mock → poll API thật. Verify UI offline phải `npm run dev`.
- Local `next dev`/`start` KHÔNG `--use-system-ca` → SSR-fetch Supabase fail (cert) nhưng SessionView poll ở CLIENT (browser, không qua proxy Node) nên prod/Vercel OK; local verify dùng mock.
- File T2-2 mới **chưa commit** (push D-017). Commit: `app/session/ app/_components/SessionView.tsx app/_components/Sudoku.tsx lib/sudoku.ts lib/sessionStatus.ts test/sudoku.test.ts test/sessionStatus.test.ts docs/`.

**Task tiếp theo:** T2-7 — validateSubQuest Server Action (deps T0-3 ✓)
**Bước tiếp theo:** `actions/validateSubQuest.ts` (specs §3) — weekday SQL theo `venue.timezone`; `code_entry` verify hash (pgcrypto `crypt()` trong RPC, không lộ đáp án); `physical_action` confirmed; valid → UPDATE sub_quest_passed. Gói RPC atomic. ĐỀ XUẤT: pgcrypto trong SQL để khỏi thêm dep node bcrypt.

### Session 10 — 2026-06-04 — T2-7 validateSubQuest Server Action
**Task:** T2-7 — validateSubQuest Server Action  |  **Kết quả:** ✅

**Bối cảnh:** D-017 ĐÃ GỠ (push hoạt động, remote ở `6178af7`). **Docker máy nay CHẠY LẠI** (Session 6/8/9 không có) → test SQL isolated được.

**Files tạo/sửa:**
- `supabase/schema.sql` — THÊM function `validate_sub_quest(p_session_id, p_venue_id, p_answer, p_confirmed)`: weekday `EXTRACT(DOW FROM NOW() AT TIME ZONE venue.timezone)` (Invariant #1); chọn quest theo input (answer→code_entry / confirmed→physical_action) + `active_weekdays @> to_jsonb(dow)`; `code_entry` verify `crypt(lower(btrim(answer)),hash)=hash` (pgcrypto bcrypt — không lộ đáp án); `physical_action`=confirmed; valid→UPDATE sub_quest_passed+response. Idempotent (đã pass→valid). `SET search_path=public,extensions`. `CREATE OR REPLACE`. **CHƯA apply lên Supabase**.
- `actions/validateSubQuest.ts` — TẠO (`"use server"`): `validateSubQuest(sessionId, {answer?|confirmed?})` → validate UUID → venue_id env → RPC → map: pass→`{ok:true,valid:true}`, mã sai→`{ok:true,valid:false}` (thử lại), lỗi cứng→`{ok:false,error}`.
- `test/validateSubQuest.test.ts` — TẠO: 1 offline guard + 1 live (probe-skip; code sai→đúng(trim)→idempotent + physical_action; token `0c..`/`0d..` tự dọn `finally`).
- `supabase/tests/validate_sub_quest_test.sql` — TẠO: 8 nhánh SQL (physical, code đúng/normalize/sai, idempotent, not-running, not-found, no-quest-today).

**Test results:**
- `npm test` → ✅ **32 PASS / 0 FAIL / 1 SKIP** (skip = live validate_sub_quest, chưa apply Supabase). Offline guard PASS.
- `npx tsc --noEmit` → ✅ 0 (sau fix `row?.field` null-guard) · `npm run lint` → ✅ clean · `npm run build` → ✅.
- **Docker SQL (Postgres 16 isolated):** `validate_sub_quest` **8/8 PASS** (bcrypt verify "1234"/normalize/sai qua pgcrypto chạy thật) + `get_session_status` **6/6 PASS** (Session 8 viết nhưng chưa từng chạy Docker → nay đóng nốt).

**Quyết định kỹ thuật (ADR):**
- **Verify bcrypt bằng pgcrypto trong RPC (KHÔNG dep node bcryptjs).** Hash seed `$2a$` (pgcrypto) → `crypt(input,hash)=hash` verify ngay SQL → gói weekday+select+verify+update thành 1 RPC atomic (Inv #1/#2), khỏi thêm dependency. `SET search_path=public,extensions` để crypt resolve cả Docker (public) lẫn Supabase (extensions); schema không tồn tại trong path bị bỏ qua (an toàn).
- **Disambiguate quest theo INPUT** (answer→code_entry, confirmed→physical_action) thay vì quest_id — khớp signature spec. Giả định ≤1 quest mỗi loại active/ngày (`LIMIT 1`).
- **Chuẩn hoá `lower(btrim(answer))`** trước verify (khớp cách hash seed). Đáp án KHÔNG rời server.
- **Mã sai = `{ok:true, valid:false}`** (thử lại được); NO_QUEST_TODAY/SESSION_NOT_RUNNING = lỗi cứng `{ok:false}`.
- **Gate `status=RUNNING`** (ngoài spec literal) → không pass quest trên phiên EXPIRED/COMPLETED. Idempotent đã-pass→valid (không re-verify).

**Vấn đề gặp phải (để session sau không vấp):**
- **tsc:** `.single()` trả `data: T|null` → `row.field` lỗi TS18047 → fix `row?.field` trong assert. (Pattern y hệt sessionStatus.test.ts Session 8 lại không lỗi — cứ `?.` cho chắc.)
- **Docker máy nay CHẠY** → test SQL isolated (mạnh hơn live-skip). Cách: `docker run -d --name opr-pg -e POSTGRES_PASSWORD=postgres postgres:16-alpine` → `docker cp file opr-pg:/tmp/` → `docker exec opr-pg psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/x.sql`. **PowerShell KHÔNG hỗ trợ `< file` redirect → PHẢI `docker cp`+`-f`, đừng `< file`.** ON_ERROR_STOP=1 → exit≠0 nếu bất kỳ RAISE EXCEPTION.
- **Live test SKIP** vì validate_sub_quest chưa apply Supabase. **Đóng:** user chạy `schema.sql` SQL Editor → `npm test` → **33/0/0**. Hàm đã proven Docker 8/8 → rủi ro thấp.
- T2-2 + T2-7 **chưa commit/push** (push đã hoạt động). Commit: `supabase/ actions/validateSubQuest.ts test/validateSubQuest.test.ts app/session/ app/_components/ lib/ test/ docs/`.

**Task tiếp theo:** T2-3 — Phase 2 UI Offline Quest (Blind Box) (deps T2-2 ✓ + T2-7 ✓)
**Bước tiếp theo:** Thay placeholder Phase 2 ở `SessionView` bằng Blind Box thật — render quest từ `sub_quest_config`; `code_entry` ô nhập → `validateSubQuest({answer})`; `physical_action` nút → `validateSubQuest({confirmed:true})`; `vibrate([200,100,200])` + visual border pulse (Inv #4) + beep; `sub_quest_passed=true` → khoá. Cần truyền `sub_quest_config` xuống client (page fetch hoặc API).

### Session 11 — 2026-06-04 — T0-4 Vercel deployment (hoàn tất) + push T2-7
**Task:** T0-4 — Vercel deployment (nốt nửa Vercel)  |  **Kết quả:** ✅  (Phase 0 hoàn tất 4/4)

**Bối cảnh:** Nửa Vercel deferred từ Session 4 (cần tài khoản user). User đã set env + deploy; session này push T2-7 + verify deploy LIVE → đóng T0-4.

**Việc:**
- **Push T2-7** commit `932530a` lên GitHub (`c036465..932530a main -> main`), remote khớp local. (T2-2 user đã tự commit `c036465 update` trước đó, kèm `.claude`/`.mcp.json`.)
- **Verify deploy Vercel** `https://off-phone-reward-6t79.vercel.app` qua curl prod thật.

**Test results (curl prod):**
- `/` → ✅ HTTP 200 + đủ copy ("BẮT ĐẦU"/"45 phút"/"giảm 10"/"Gác"/"đăng nhập") + màu branding `#0F766E`/`#F59E0B`.
- `/api/session-status` no-id → ✅ 400; `?id=<uuid random>` → ✅ **404 `{"error":"SESSION_NOT_FOUND"}`** → chứng minh **5 env biến set đúng + Supabase reachable từ Vercel + RPC `get_session_status` live trên prod** (không 500).
- `/session` no-id → ✅ 307 redirect; `?id=<uuid>` → ✅ 200 (loading shell).

**Quyết định kỹ thuật:**
- **T0-4 đóng** — cả 2 nửa (Supabase/local Session 4 + Vercel Session 11). **App pilot LIVE public.** Phase 0 hoàn tất 4/4.
- Branding prod hiển thị THẬT (SSR-fetch Supabase OK trên Vercel — khác local bị corporate proxy chặn → default).
- Auto-deploy GitHub→Vercel xác nhận gián tiếp: code đã push (T2-1 API + T2-2 /session) đều có trên prod.

**Vấn đề gặp phải:**
- Không có. Verify curl.exe + `[Console]::OutputEncoding=UTF8` để match copy tiếng Việt chuẩn.
- ⚠️ `validate_sub_quest` (T2-7) **chưa apply lên Supabase** → Blind Box (T2-3) gọi sẽ lỗi cho tới khi user re-run `schema.sql` SQL Editor.

**Task tiếp theo:** T2-3 — Phase 2 UI Offline Quest (Blind Box) (deps T2-2 ✓ + T2-7 ✓)
**Bước tiếp theo:** Blind Box thật vào SessionView (wire `validateSubQuest`) + vibrate/visual/beep. Apply `validate_sub_quest` lên Supabase trước khi test prod.

### Session 12 — 2026-06-04 — T2-3 Phase 2 UI Offline Quest (Blind Box)
**Task:** T2-3 — Phase 2 UI — Offline Quest (Blind Box)  |  **Kết quả:** ✅

**Files tạo/sửa:**
- `supabase/schema.sql` — THÊM `get_active_quests(p_venue_id)`: weekday SQL (venue.timezone, Inv #1) filter quest active hôm nay + **STRIP answer_hash** → JSONB (chỉ id/type/title/description/hint/confirm_button). Venue không có → `[]`. `WITH ORDINALITY` giữ thứ tự. **CHƯA apply Supabase**.
- `lib/quests.ts` — TẠO (pure, client-safe): type `ActiveQuest` (KHÔNG answer_hash) + `MOCK_QUESTS` (khớp seed) cho dev.
- `actions/getActiveQuests.ts` — TẠO (`"use server"`): RPC get_active_quests, venue_id env → `ActiveQuest[]`. Lỗi/chưa-apply → `[]`.
- `lib/audio.ts` — THÊM `playBeep()`: oscillator ngắn, CHỈ kêu nếu audio unlocked ở START (Inv #5).
- `app/_components/BlindBox.tsx` — TẠO (`"use client"`): render quest (code_entry input+Gửi / physical_action button), `onValidate` → feedback (sai→"thử lại"); passed→khoá (Done). Visual pulse overlay `animate-pulse` LUÔN chạy (Inv #4). Guidance "Mở Blind Box + đọc Sổ Người Lạ".
- `app/_components/SessionView.tsx` — SỬA: phase 2 → `<BlindBox>`; vào phase 2 → `navigator.vibrate([200,100,200])` + `playBeep()` (1 lần, flag `beeped`); fetch getActiveQuests khi phase 2 (real) / MOCK_QUESTS (dev); `handleValidate` (real validateSubQuest / mock "1234"); `passed = status.sub_quest_passed || localPassed`. Mock subQuestPassed=false (đổi từ T2-2) để test Blind Box.
- `supabase/tests/get_active_quests_test.sql` — TẠO: 3 nhánh (2 quest no-answer_hash + đủ 2 loại, venue not-found→[], weekday-filter loại quest ngày khác).
- `test/getActiveQuests.test.ts` — TẠO: live (probe-skip) xác nhận trả quest + KHÔNG lộ answer_hash.

**Test results:**
- `npm test` → ✅ **32 PASS / 0 FAIL / 2 SKIP** (validate_sub_quest + get_active_quests live — chưa apply Supabase).
- tsc 0 · lint clean · `npm run build` ✅ (`/session` 3.82 kB).
- **Docker SQL `get_active_quests` 3/3 PASS** (2 quest + KHÔNG lộ answer_hash + weekday-filter ngày khác bị loại).
- **Render thật (next dev mock=1500, Phase 2):** "Mở Blind Box"/"Đứng dậy vươn vai"/"Sổ Người Lạ"/"Gửi"/"Đã xong"/`animate-pulse` đều OK; 1 input + 2 button. HTTP 200.

**Quyết định kỹ thuật (ADR):**
- **RPC `get_active_quests` riêng cho DISPLAY** (tách khỏi validateSubQuest = VALIDATE). Weekday filter + strip answer_hash trong SQL (Inv #1 + bảo mật đáp án — client chỉ nhận field hiển thị).
- **Fetch quest LAZY khi phase=2** (client gọi server action) thay vì page.tsx await mỗi load → không thêm latency cho phase 1.
- **BlindBox inject `onValidate`** → tách data/validation khỏi UI → mock được (dev "1234") + dùng lại real. `passed = server || localPassed` (optimistic UX, poll xác nhận sau).
- **Visual pulse = overlay div `animate-pulse`** (Tailwind built-in, không cần keyframe globals.css). Luôn chạy → fallback iOS khi vibrate fail (Inv #4). Beep gated unlock (Inv #5).

**Vấn đề gặp phải:**
- Không có lỗi. Docker chạy → SQL test isolated 3/3.
- ⚠️ Phase 2 Blind Box cần CẢ `validate_sub_quest` (T2-7) + `get_active_quests` (T2-3) apply Supabase mới chạy prod. User re-run `schema.sql` (idempotent) — thiếu thì getActiveQuests trả [] + validate trả SERVER_ERROR.
- T2-3 files **chưa commit** (commit: `supabase/ actions/getActiveQuests.ts lib/quests.ts lib/audio.ts app/_components/ test/getActiveQuests.test.ts docs/`).

**Task tiếp theo:** T2-4 — Phase 3 UI Meditation (deps T2-3 ✓)
**Bước tiếp theo:** Thay placeholder Phase 3 ở SessionView bằng Meditation — text fade-out; hourglass SVG animate (không GIF); lo-fi audio gated bởi `audio_gesture` (sessionStorage set ở START, Inv #5); chưa gesture → nút "Bật nhạc".

### Session 13 — 2026-06-04 — T2-4 Phase 3 UI Meditation
**Task:** T2-4 — Phase 3 UI — Meditation  |  **Kết quả:** ✅  (3 pha focus UI hoàn tất: Sudoku → Blind Box → Thiền)

**Bối cảnh:** User đã apply `schema.sql` (validate_sub_quest + get_active_quests) → 2 live test giờ PASS → `npm test` **34/0/0** (đóng 2 skip Session 12). Phase 2 Blind Box chạy được trên prod.

**Files tạo/sửa:**
- `app/_components/Meditation.tsx` — TẠO (`"use client"`): Hourglass inline SVG lật chậm CSS `animate-hourglass` (KHÔNG GIF) + câu thiền fade-cycle 6s (`animate-med-fade`, remount `key`). Audio: `isAudioUnlocked()` (gesture START còn sống qua client-nav) → autoplay `startAmbient()`; chưa unlock → nút "Bật nhạc" (click=gesture → unlock+phát). `stopAmbient()` khi unmount.
- `lib/audio.ts` — THÊM `startAmbient()`/`stopAmbient()`: pad sine 3 nốt (A2/E3/A3) volume 0.05, procedural (KHÔNG cần file asset). CHỈ chạy nếu unlocked (Inv #5). Idempotent.
- `app/globals.css` — THÊM keyframes `medFade` (text fade) + `hourglassFlip` (lật 360° loop vô hạn).
- `app/_components/SessionView.tsx` — SỬA: phase 3 placeholder → `<Meditation />` (+ import).

**Test results:**
- `npm test` → ✅ **34 PASS / 0 FAIL / 0 SKIP** (validate_sub_quest + get_active_quests live giờ PASS — user đã apply schema). tsc 0 · lint clean · build ✅ (`/session` 4.52 kB).
- **Render thật (next dev mock=2200, Phase 3):** "Pha 3 · Thiền" + "Hít thở…" + `animate-hourglass`/`animate-med-fade` + `<svg>`/`<path>` đều OK. HTTP 200.

**Quyết định kỹ thuật (ADR):**
- **Lo-fi audio = pad sine procedural** (Web Audio, không file asset) → đỡ thêm binary; đổi sang asset lo-fi thật trước pilot nếu muốn. Volume 0.05 rất nhẹ.
- **Autoplay theo `isAudioUnlocked()` (module state), KHÔNG `sessionStorage.audio_gesture`.** Sau reload/mở thẳng, module `unlocked` reset → browser CHẶN autoplay (cần gesture mới) → đúng phải hiện nút. sessionStorage chỉ nói "đã từng gesture" nhưng KHÔNG đủ qua autoplay policy. Module `unlocked` (context còn sống qua client-nav từ START) mới là tín hiệu đáng tin (Inv #5). → **Đính chính** ghi chú Session 7 ("dùng sessionStorage.audio_gesture cho T2-4").
- **Hourglass = inline SVG + CSS keyframe**, text fade qua `animate-med-fade` + remount `key` mỗi câu — KHÔNG GIF, không asset.
- **SSR-safe:** audio block init `audioOn=false/needGesture=false` → render `null` tới khi mount (effect mới quyết) → tránh SSR hiện nhầm "đang phát", không hydration mismatch.

**Vấn đề gặp phải:**
- Không có lỗi. Task visual+audio → verify qua build + render (không có pure logic để unit test → không thêm test file; suite giữ 34/0/0).
- Nút audio client-only (sau hydration) → curl SSR không thấy; verify bằng build + reasoning (đúng pattern client app).

**Task tiếp theo:** T2-5 — visibilitychange tracking (deps T2-2 ✓)
**Bước tiếp theo:** SessionView thêm listener `visibilitychange` (mount/cleanup) → `document.hidden` → POST `/api/log-infraction` (route mới) → INCREMENT `focus_sessions.infraction_count`; banner cảnh báo sau 3 lần; MVP KHÔNG auto-fail.

### Session 14 — 2026-06-04 — T2-5 visibilitychange tracking
**Task:** T2-5 — visibilitychange tracking  |  **Kết quả:** ✅  (MVP qua mốc 50% — 13/25)

**Files tạo/sửa:**
- `supabase/schema.sql` — THÊM `log_infraction(p_session_id)`: `UPDATE infraction_count=infraction_count+1 WHERE id=$1 AND status='RUNNING' RETURNING` (atomic row-lock — Inv #2, không lost-update khi rời/về nhiều lần); non-RUNNING/not-found → `COALESCE(...,-1)`. **CHƯA apply Supabase**.
- `app/api/log-infraction/route.ts` — TẠO (POST, `force-dynamic`): body `{id}` (fallback `?id=`) → validate UUID (400) → RPC log_infraction → `{infraction_count}` + `no-store`. 500 khi lỗi.
- `app/_components/SessionView.tsx` — SỬA: state `infractions`; effect listener `visibilitychange` (chỉ khi `visibilityState==='hidden'` → `fetch POST keepalive` → set count; mock KHÔNG log); banner đỏ `fixed top` khi count ≥3. Đăng ký mount / cleanup unmount.
- `supabase/tests/log_infraction_test.sql` — TẠO: 3 nhánh (increment 1→2 + ghi DB, EXPIRED→-1 không tăng, not-found→-1).
- `test/logInfraction.test.ts` — TẠO: live (probe-skip) increment 1→2 + DB + not-found→-1 (token `0e..` tự dọn).

**Test results:**
- `npm test` → ✅ **34 PASS / 0 FAIL / 1 SKIP** (skip = log_infraction live, chưa apply). tsc 0 · lint clean · build ✅ (route `/api/log-infraction` = ƒ).
- **Docker SQL `log_infraction` 3/3 PASS** (increment atomic + RUNNING-gate giữ 0 + not-found→-1).
- **curl POST:** no-body & bad-id → **400** `{"error":"INVALID_SESSION_ID"}`.

**Quyết định kỹ thuật (ADR):**
- **Increment qua RPC `UPDATE col=col+1`** (atomic row-lock, Inv #2) — supabase-js `.update()` KHÔNG biểu diễn được `col+1` (chỉ literal) → bắt buộc RPC. Gate `status='RUNNING'` (vi phạm chỉ tính khi đang chạy); non-RUNNING → -1 (route coi no-op).
- **fetch `keepalive:true`** (KHÔNG sendBeacon) → POST gửi được cả khi tab vừa ẩn, NHƯNG vẫn đọc được response (count) → cập nhật banner khi user quay lại tab. sendBeacon thì mất response.
- **Banner dùng count từ response (DB-accurate)**; reload reset banner tới infraction kế (MVP chấp nhận — không thêm field vào session-status). MVP **KHÔNG auto-fail** (chỉ đếm + cảnh báo).
- Mock không log (cần session thật) → banner verify bằng build+logic; route 400 curl + RPC qua Docker/live.

**Vấn đề gặp phải:**
- ⚠️ `log_infraction` chưa apply Supabase → live test skip + infraction trên prod chưa ghi tới khi user re-run `schema.sql`.
- T2-3/T2-4/T2-5 (+docs) **chưa commit/push** từ sau `932530a`.

**Task tiếp theo:** T2-6 — Clock sync (deps T2-1 ✓ + T2-2 ✓)
**Bước tiếp theo:** 2/3 checklist đã có nhờ T2-2 (fetchTime + computeLiveDelta). Còn **resync smooth**: poll mới về, |serverDelta − displayedDelta| < 5s → nội suy mượt thay vì nhảy; ≥5s → snap. (Tránh countdown giật mỗi 30s.)

### Session 15 — 2026-06-04 — T2-6 Clock sync
**Task:** T2-6 — Clock sync  |  **Kết quả:** ✅  (Phase 2 hoàn tất 7/7)

**Bối cảnh:** User đã apply `log_infraction` lên Supabase → `npm test` giờ **39/0/0** (đóng skip Session 14; tất cả 4 live RPC pass).

**Files tạo/sửa:**
- `lib/sessionStatus.ts` — THÊM `reconcileStartEpoch(prev, serverDelta, fetchTimeMs, snapMs=5000, ease=0.34)`: anchor mốc bắt đầu phiên (client-clock ms). `candidate=fetchTime-serverDelta*1000`; lần đầu (null)→candidate; |drift|<snapMs→EASE (prev+drift*ease); ≥snapMs→SNAP. + `elapsedSince(startEpoch, now)`. Pure.
- `app/_components/SessionView.tsx` — SỬA: bỏ state `fetchTime` → `startEpochRef` (useRef); poll resync `startEpochRef.current = reconcileStartEpoch(...)`; countdown `elapsedSince(startEpochRef.current, now)` thay `computeLiveDelta` → KHÔNG giật mỗi poll. Mock set epoch từ mockDelta. `mockDelta` vào deps poll-effect (lint).
- `test/sessionStatus.test.ts` — THÊM 5 test (reconcileStartEpoch: first/ease/snap×2 + elapsedSince).

**Test results:**
- `npm test` → ✅ **39 PASS / 0 FAIL / 0 SKIP** (4 live RPC: get_session_status, validate_sub_quest, get_active_quests, log_infraction — đều pass). tsc 0 · lint clean · build ✅ (`/session` 4.92 kB).
- **Render (next dev mock):** mock=120 (phase1) / 2200 (phase3) / 2750 (CLAIMABLE) đều HTTP 200, không crash; countdown gate "--:--" (SSR) đúng; CLAIMABLE không có countdown (đúng).

**Quyết định kỹ thuật (ADR):**
- **Anchor "startEpoch" thay (serverDelta, fetchTime) trực tiếp.** computeLiveDelta snap 100% mỗi poll → giật khi lệch (clock drift / latency). `reconcileStartEpoch` ease 34% khi lệch <5s (mượt qua vài poll) / snap khi ≥5s (sai nhiều → nhảy đúng). Display-only → Invariant #1 giữ nguyên (phase + nguồn thời gian vẫn server-delta).
- **`startEpochRef` = useRef** (không state) → cập nhật không gây re-render thừa; tick `now` (state 1s) + setStatus (poll) drive re-render → correction áp ngay khi poll.
- **Giữ `computeLiveDelta`** trong lib (vẫn export + test) dù app không dùng nữa — helper hợp lệ, không xoá (tránh phá test cũ).

**Vấn đề gặp phải:**
- lint exhaustive-deps: mock branch dùng `mockDelta` → thêm vào deps poll-effect (stable prop, không gây re-run thừa).

**Task tiếp theo:** T3-1 — CLAIM button logic (deps T2-1 ✓) → mở Phase 3
**Bước tiếp theo:** Thay placeholder CLAIMABLE bằng nút CLAIM thật — hiện khi `claim_window_open && sub_quest_passed`; trong window chưa pass quest → nhắc Blind Box; `claim_window_expired` → message + link landing; nút to/nổi bật. Hành động claim (GPS/bypass/claim_voucher) là T3-2→T3-4.

### Session 16 — 2026-06-04 — T3-1 CLAIM button logic
**Task:** T3-1 — CLAIM button logic  |  **Kết quả:** ✅  (mở Phase 3 — luồng nhận thưởng)

**Bối cảnh:** T3-1 = CHỈ LOGIC HIỂN THỊ nút CLAIM. Hành động claim THẬT (GPS → bypass → RPC `claim_voucher`) là T3-2..T3-4. Vào session: working tree còn T2-6 (clock sync) chưa commit từ `b008e4e`.

**Files tạo/sửa:**
- `lib/sessionStatus.ts` — THÊM type `ClaimView` + pure `deriveClaimView(status, passed)` → `CLAIM|NEED_QUEST|EXPIRED|NONE`. Ưu tiên EXPIRED > (open ? CLAIM/NEED_QUEST) > NONE. `claim_window_open` đã tự gate `status='RUNNING'` (COMPLETED/FAILED → NONE). Display-only (Invariant #1 giữ: nguồn thời gian vẫn server-delta).
- `app/_components/ClaimPanel.tsx` — TẠO (`"use client"`): render theo `view` — CLAIM (nút amber `rounded-2xl text-2xl font-extrabold shadow`, CTA to/nổi bật) / NEED_QUEST (nhắc hoàn thành Blind Box) / EXPIRED (message + link `/`). `onClaim?` là seam T3-2 (để TRỐNG ở T3-1 → bấm hiện "đang chuẩn bị" + ghi chú bước GPS sẽ có sau).
- `app/_components/SessionView.tsx` — SỬA: import `deriveClaimView` + `ClaimPanel`; phase CLAIMABLE: `Placeholder` → `<ClaimPanel view={deriveClaimView(status, passed)} />` (XOÁ hàm `Placeholder` không còn dùng); thêm prop `mockPassed` (mặc định false) cho mock status.
- `app/session/page.tsx` — SỬA: thêm `?passed=1` (dev-only, gate `NODE_ENV≠production` như `mock`) → `mockPassed` để verify nút CLAIM offline.
- `test/sessionStatus.test.ts` — THÊM 6 test `deriveClaimView` (CLAIM, NEED_QUEST, optimistic passed override, EXPIRED-ưu-tiên, NONE phase 1/2/3, COMPLETED→NONE).

**Test results:**
- `npm test` → ✅ **45 PASS / 0 FAIL / 0 SKIP** (+6 deriveClaimView; 4 live RPC: get_session_status, validate_sub_quest, get_active_quests… vẫn pass). tsc 0 · lint clean · build ✅ (`/session` 5.31 kB).
- **Render thật (next dev mock):** `mock=2750&passed=1` → CLAIM ("Giờ Vàng"/"NHẬN VOUCHER"/"45 phút gác máy"); `mock=2750` → NEED_QUEST ("Sắp xong"/"Blind Box"); `mock=3000` → EXPIRED ("hết hạn"/"48 phút"); `mock=120` → Pha 1 — tất cả HTTP 200.

**Quyết định kỹ thuật (ADR):**
- **Tách pure `deriveClaimView` → lib (test offline mọi nhánh) + ClaimPanel presentational** — đúng pattern dự án (logic ở lib, React verify qua build+render). EXPIRED ưu tiên cao nhất (dù trong CLAIMABLE phase nó không kích hoạt vì `derivePhase>2880` đã ra EXPIRED + màn EXPIRED upstream bắt trước — giữ defensive cho hàm hoàn chỉnh).
- **`passed` effective = `status.sub_quest_passed || localPassed`** (optimistic, đã có sẵn ở SessionView) truyền vào deriveClaimView → nút CLAIM mở ngay khi vừa pass quest, không chờ poll.
- **`onClaim` để TRỐNG ở T3-1** (optional prop) → không tạo hành vi giả; bấm chỉ hiện "đang chuẩn bị". T3-2 ráp GPS vào đây. Tránh empty-function (không pass prop thay vì `() => {}`).
- **Mock `?passed=1`** thêm vào để verify CLAIM offline (mock mặc định `sub_quest_passed=false` để test Blind Box — không thể thấy CLAIM nếu không có cờ này). Dev-only, vô hại prod.

**Vấn đề gặp phải:**
- `codegraph_explore` trả source = Read-equivalent nhưng Edit tool vẫn đòi Read thật trước khi sửa → phải Read file lại trước Edit (codegraph để ĐỊNH VỊ + đọc, Edit cần Read riêng).
- Xoá `Placeholder` (không còn ai dùng sau khi thay CLAIMABLE) để lint `no-unused-vars` không báo.

**Task tiếp theo:** T3-2 — GPS coordinate capture (deps T3-1 ✓)
**Bước tiếp theo:** Wire `ClaimPanel onClaim` → `navigator.geolocation.getCurrentPosition({enableHighAccuracy:true, timeout:10000})`; loading "Đang lấy vị trí…"; OK → claimVoucher (T3-4); PERMISSION_DENIED/TIMEOUT/UNAVAILABLE → fallback bypass (T3-3); accuracy>100m → warning vẫn tiếp tục.

### Session 17 — 2026-06-04 — T3-2 GPS coordinate capture
**Task:** T3-2 — GPS coordinate capture  |  **Kết quả:** ✅  (Phase 3 = 2/5)

**Bối cảnh:** Chuỗi claim THẬT bắt đầu. T3-2 = bắt toạ độ FE; Haversine + cấp voucher là T3-4 (server), bypass là T3-3. ClaimPanel (T3-1) có nút CLAIM với `onClaim` để trống → nay thay bằng luồng GPS thật.

**Files tạo/sửa:**
- `lib/geolocation.ts` — TẠO (lõi injectable, test offline): `getPosition(geo, GEO_OPTIONS)` → `Promise<GeoResult>` (LUÔN resolve, không reject → UI map 1 nhánh) + `classifyGeoError(code)` (1→PERMISSION_DENIED, 2→UNAVAILABLE, 3→TIMEOUT) + const `GEO_OPTIONS{enableHighAccuracy:true,timeout:10000,maximumAge:0}` + `ACCURACY_WARN_M=100`. Kiểu `GeoLike`/`GeoOptions` tối thiểu (không phụ thuộc DOM lib → mock dễ; `navigator.geolocation` khớp cấu trúc).
- `app/_components/ClaimPanel.tsx` — VIẾT LẠI nhánh CLAIM: bỏ stub `onClaim`/`claiming` (T3-1) → state machine `idle → locating → located | geo_error`. Nút "🎁 NHẬN VOUCHER" → `getPosition(navigator.geolocation)`; locating "📍 Đang lấy vị trí…"; located → "✅ ±{accuracy}m" + (lowAccuracy → ⚠️ cảnh báo vẫn tiếp tục) + gọi `onLocated({lat,lng})` (seam T3-4); geo_error → message theo reason (`GEO_MESSAGE`) + nút "Thử lại" + placeholder bypass (seam T3-3). Prop đổi `onClaim?`→`onLocated?`. EXPIRED/NEED_QUEST giữ nguyên.
- `test/geolocation.test.ts` — TẠO: 9 test (classifyGeoError 4 mã · GEO_OPTIONS spec · success ≤100m lowAccuracy=false · >100m=true · biên 100=false · DENIED/TIMEOUT/UNAVAILABLE · undefined→UNSUPPORTED).

**Test results:**
- `npm test` → ✅ **54 PASS / 0 FAIL / 0 SKIP** (+9 geolocation; 4 live RPC vẫn pass). tsc 0 · lint clean · build ✅ (`/session` 5.95 kB).
- **Render thật (next dev mock):** `mock=2750&passed=1` → nút "NHẬN VOUCHER" (idle); `mock=2750`→NEED_QUEST; `mock=3000`→EXPIRED; `mock=120`→Pha 1 — đều HTTP 200. (Các state locating/located/geo_error cần click browser → cover bằng 9 unit test + build, như pattern T2-4 audio.)

**Quyết định kỹ thuật (ADR):**
- **`getPosition` LUÔN resolve `GeoResult` (không reject)** → UI chỉ cần `if (r.ok)` thay vì try/catch + classify rải rác. Lỗi gói thành `reason` rời rạc (4 loại).
- **Kiểu `GeoLike`/`GeoOptions` tự định nghĩa tối thiểu** (không dùng DOM `Geolocation`/`PositionOptions`) → mock trong node:test không cần jsdom; `navigator.geolocation` vẫn truyền thẳng được (structural typing). Cùng triết lý "lõi injectable, test offline" của useGuestToken/sessionStatus.
- **accuracy > 100m KHÔNG chặn** — set `lowAccuracy=true`, vẫn `located` + gọi `onLocated` (claim tiếp). Chỉ cảnh báo UI (checklist: "warning nhưng vẫn tiếp tục"). GPS indoor sai số lớn là nợ D-003 (có bypass).
- **KHÔNG lưu toạ độ** (specs §4 Module 3): coords chỉ truyền qua `onLocated` rồi discard; `located` state chỉ giữ `accuracy` để hiển thị.
- **geo_error là seam T3-3:** placeholder "nhập mã nhân viên" + nút "Thử lại" → T3-3 thay placeholder bằng input bypass.

**Vấn đề gặp phải:**
- Không có lỗi. (Lo ngại `Geolocation` không assignable vào `GeoLike` do variance → dùng interface tối thiểu, tsc PASS ngay.)
- State GPS tương tác (locating/located/error) không curl-verify được (cần click) → 9 unit test `getPosition` cover logic + build cover compile.

**Task tiếp theo:** T3-3 — Manual bypass fallback (deps T3-2 ✓) 🟢 MVP static code
**Bước tiếp theo:** Thay placeholder ở `geo_error` của ClaimPanel bằng input nhập mã → Server Action so sánh `CASHIER_BYPASS_CODE` (env) bằng constant-time (`crypto.timingSafeEqual`); đúng → claim tiếp (T3-4); sai → lỗi thân thiện không reveal lý do.

### Session 18 — 2026-06-05 — T3-3 Manual bypass fallback
**Task:** T3-3 — Manual bypass fallback 🟢 (MVP static code)  |  **Kết quả:** ✅  (Phase 3 = 3/5)

**Bối cảnh:** Fallback khi GPS (T3-2) lỗi. ClaimPanel nhánh `geo_error` đã chừa sẵn placeholder bypass → nay thay bằng form nhập mã + verify constant-time server-side.

**Files tạo/sửa:**
- `lib/bypass.ts` — TẠO: `safeEqual(a,b)` constant-time = hash SHA-256 cả hai (`node:crypto`) về 32 byte RỒI `timingSafeEqual`. Hash trước → không throw khi lệch độ dài + không leak độ dài/vị trí ký tự sai. Server-only.
- `actions/verifyBypass.ts` — TẠO (`"use server"`): `verifyBypass(code)` đọc env `CASHIER_BYPASS_CODE` (server-only) → `{ok:true,valid}` (mã sai/rỗng → valid:false) | `{ok:false,error:"SERVER_ERROR"}` (chưa set env). Trim input.
- `app/_components/ClaimPanel.tsx` — SỬA: thêm prop `onBypass?: BypassFn` + state `bypass_ok`; nhánh `geo_error` render `<BypassForm>` (input "Mã nhân viên" inputMode=numeric + nút "Xác nhận") → `onBypass`; đúng → `bypass_ok` (seam T3-4); sai HOẶC lỗi → CÙNG message "❌ Mã không đúng, thử lại nhé" (không reveal lý do). Export type `BypassFn`.
- `app/_components/SessionView.tsx` — SỬA: import `verifyBypass` + type `BypassFn`; thêm `handleBypass` (real verifyBypass / mock dev "1234"); truyền `onBypass={handleBypass}` vào ClaimPanel.
- `test/bypass.test.ts` — TẠO: 7 test (safeEqual: giống/khác/lệch-độ-dài-không-throw/case-sensitive; verifyBypass: đúng+trim / sai+rỗng / chưa-set-env — dùng `withEnv` save-restore để không lệ thuộc .env.local).

**Test results:**
- `npm test` → ✅ **61 PASS / 0 FAIL / 0 SKIP** (+7 bypass; 4 live RPC vẫn pass). tsc 0 · lint clean · build ✅ (`/session` 6.3 kB).
- **Render thật (next dev mock):** `mock=2750&passed=1`→CLAIM "NHẬN VOUCHER" · `mock=2750`→NEED_QUEST · `mock=3000`→EXPIRED đều 200. (Form bypass ở state `geo_error` cần GPS-fail click → cover bằng 7 unit test + build, như pattern T2-4/T3-2.)

**Quyết định kỹ thuật (ADR):**
- **Constant-time = hash-rồi-`timingSafeEqual`** (không so trực tiếp): `timingSafeEqual` throw nếu lệch độ dài → hash SHA-256 về cùng 32 byte trước → an toàn độ dài + không exception. Pattern chuẩn cho so sánh secret độ dài tuỳ ý.
- **`verifyBypass` chỉ là UX feedback tức thì — KHÔNG phải cổng bảo mật cuối.** Ghi rõ trong doc: **T3-4 `claimVoucher` PHẢI re-verify mã server-side** (`safeEqual`) trước RPC; không tin cờ "đã verify" từ client (client có thể giả). Presence (GPS/bypass) là điều kiện claim → phải check ở action cấp voucher.
- **Mã sai vs lỗi server → cùng một message** ("Mã không đúng, thử lại nhé") để không reveal (specs §4 Module 3 "không reveal lý do"). `valid:false` không kèm lý do.
- **`lib/bypass.ts` (node:crypto) chỉ import bởi server action + test** → KHÔNG vào client bundle (ClaimPanel chỉ import type `BypassFn`). build xác nhận.
- **Mock dev "1234"** (giống Blind Box) cho `handleBypass` — local có thể vắng env, mock không gọi server.

**Vấn đề gặp phải:**
- Không có lỗi. `withEnv` save/restore cần thiết vì `npm test` nạp `.env.local` (`--env-file-if-exists`) có thể đã set `CASHIER_BYPASS_CODE` → test phải tự kiểm soát env để deterministic.

**Task tiếp theo:** T3-4 — claimVoucher Server Action (deps T0-3 ✓, T3-2 ✓, T3-3 ✓)
**Bước tiếp theo:** `actions/claimVoucher.ts` — presence GPS (Haversine `lib/haversine.ts` mới, test điểm biết trước, so `venue.radius_meters`) HOẶC bypass (re-verify `safeEqual`) → RPC `claim_voucher` (đã có §2). Map lỗi RPC thân thiện. Wire `onLocated`/`bypass_ok` của ClaimPanel → claimVoucher. **Test race 2 request → 1 voucher.**

### Session 19 — 2026-06-05 — T3-4 claimVoucher Server Action
**Task:** T3-4 — claimVoucher Server Action (qua RPC claim_voucher)  |  **Kết quả:** ✅  (Phase 3 = 4/5)

**Bối cảnh:** Khâu nguyên tử cuối luồng claim. RPC `claim_voucher` (out_code/out_error) + bảng venues (latitude/longitude/radius_meters) đã có sẵn schema từ T0-3 → session này chỉ viết Server Action + Haversine + wire UI + test race.

**Files tạo/sửa:**
- `lib/haversine.ts` — TẠO (pure): `haversineMeters(lat1,lng1,lat2,lng2)` (R=6371km, clamp √a≤1). Test offline 5 điểm biết trước.
- `lib/claim.ts` — TẠO: shared types `ClaimPresence` (`{lat,lng}` | `{bypassCode}`), `ClaimError`, `ClaimVoucherResult` — client+server cùng dùng (pure, không runtime).
- `actions/claimVoucher.ts` — TẠO (`"use server"`): validate sessionId/venueId → `verifyPresence` (helper nội bộ, KHÔNG export): bypass → re-verify `safeEqual` env (KHÔNG tin client); GPS → đọc `venues.latitude/longitude/radius_meters` → Haversine ≤ radius (toạ độ discard). → RPC `claim_voucher(session_id, venue_id)` → map out_error (QUEST_NOT_PASSED/OUTSIDE_WINDOW/SESSION_NOT_RUNNING/POOL_EMPTY/SESSION_NOT_FOUND→INVALID_SESSION). Thành công → `{ok:true, code}`.
- `app/_components/ClaimPanel.tsx` — VIẾT LẠI luồng CLAIM: state `idle→locating→claiming→claimed | need_bypass | claim_error`. GPS ok → `runClaim({lat,lng})`; GPS fail HOẶC claim trả PRESENCE_FAILED (ngoài radius) → `need_bypass` (form mã, `onBypass` verify tức thì → đúng → `runClaim({bypassCode})`). `claimed` → component `<Claimed>` hiện mã voucher (mono, select-all) — T3-5 làm coupon + lưu sessionStorage. Prop `onClaim: ClaimFn` (+ giữ `onBypass`). Bỏ `onLocated`.
- `app/_components/SessionView.tsx` — SỬA: import `claimVoucher` + type `ClaimFn`; `handleClaim` (real `claimVoucher(sessionId, presence)` / mock demo code "OPR-DEMO-2026"); truyền `onClaim={handleClaim}` vào ClaimPanel.
- `test/haversine.test.ts` — TẠO: 5 test (cùng điểm=0, 1° lat/lng ≈111.19km, đối xứng, ~11m).
- `test/claimVoucher.test.ts` — TẠO: 1 offline (INVALID_SESSION) + 1 **LIVE RACE** (tạo phiên → set claimable backdate 2750s + sub_quest_passed → 2 claimVoucher GPS đồng thời → assert cùng code + count=1 voucher + COMPLETED + claim lại idempotent; cleanup nhả voucher rồi xoá session, token `0f0f…ff`).

**Test results:**
- `npm test` → ✅ **68 PASS / 0 FAIL / 0 SKIP**. **Live race PASS** ("race 2 request đồng thời cùng session → đúng 1 voucher", 3440ms). 5 live RPC vẫn pass. tsc 0 · lint clean · build ✅.
- **Render thật (next dev mock):** mock=2750&passed=1 → nút "NHẬN VOUCHER"; các view khác 200. (claiming/claimed/need_bypass cần browser GPS → cover bằng unit + live race + build.)

**Quyết định kỹ thuật (ADR):**
- **Presence check Ở SERVER ACTION (claimVoucher), KHÔNG tin client.** Bypass re-verify `safeEqual` (dù T3-3 đã verifyBypass cho UX — đây là cổng bảo mật thật); GPS Haversine so radius ở Node (specs §4 Module 3 đặt Haversine ở `lib/haversine.ts`, không trong SQL). Quyền cấp voucher + window vẫn nguyên tử trong RPC.
- **GPS ngoài radius (PRESENCE_FAILED) → mời bypass** thay vì báo lỗi cứng (UX: GPS indoor sai số lớn — D-003). accuracy>100m (T3-2) KHÔNG chặn ở FE; nếu thật xa thì server PRESENCE_FAILED → bypass.
- **Race test dùng presence GPS tại toạ độ venue** (distance 0) → khỏi phụ thuộc `CASHIER_BYPASS_CODE` trong .env.local. Cleanup phải NHẢ voucher (reset AVAILABLE) TRƯỚC khi xoá session (vouchers.session_id ON DELETE SET NULL → nếu xoá trước, voucher kẹt RESERVED ngoài pool).
- **`lib/claim.ts` tách types** → client (ClaimPanel) + server (action) cùng import mà không kéo node:crypto/supabase vào client bundle.

**Vấn đề gặp phải:**
- Không có lỗi. Race test live thành công ngay (RPC FOR UPDATE + uniq_voucher_per_session đã proven từ T0-3, nay xác nhận qua Server Action thật).

**Task tiếp theo:** T3-5 — Voucher display screen (deps T3-4 ✓)
**Bước tiếp theo:** `claimed` → coupon đẹp + LƯU `claimed_voucher` sessionStorage (restore khi reload; COMPLETED screen đọc lại để hiện mã thay vì màn trống) + CTA "Thử lại ngày mai".

### Session 20 — 2026-06-05 — T3-5 Voucher display screen
**Task:** T3-5 — Voucher display screen  |  **Kết quả:** ✅  (**PHASE 3 HOÀN TẤT 5/5** — luồng nhận thưởng end-to-end)

**Bối cảnh:** Đóng Phase 3. T3-4 để `claimed` hiện mã thô (inline trong ClaimPanel); T3-5 tách thành màn coupon riêng + lưu/restore sessionStorage để reload không mất voucher.

**Files tạo/sửa:**
- `lib/voucher.ts` — TẠO (pure/injectable): `readClaimedVoucher(storage)` / `writeClaimedVoucher(storage, code)` + const `CLAIMED_VOUCHER_KEY="claimed_voucher"`. Test offline (mock Storage = Map).
- `app/_components/VoucherScreen.tsx` — TẠO: coupon mã font lớn monospace (text-3xl, select-all, break-all), viền dashed amber + 2 "lỗ vé" tròn hai bên, CTA "Thử lại ngày mai" (link `/`).
- `app/_components/SessionView.tsx` — SỬA: state `claimedVoucher` (init `mockVoucher`); effect restore từ `sessionStorage` khi mount (non-mock); `handleClaimed(code)` lưu sessionStorage + setState; render `<VoucherScreen>` ƯU TIÊN CAO NHẤT (TRƯỚC `if(!status)` và COMPLETED/EXPIRED) → reload phiên đã COMPLETED vẫn hiện mã thay vì màn "Đã hoàn thành" trống; truyền `onClaimed={handleClaimed}` vào ClaimPanel. Prop mới `mockVoucher`.
- `app/_components/ClaimPanel.tsx` — SỬA: prop `onClaimed?`; claim ok → gọi `onClaimed(r.code)` (parent swap VoucherScreen) + giữ setStep `claimed` (fallback standalone).
- `app/session/page.tsx` — SỬA: thêm mock dev `?voucher=<code>` → `mockVoucher` (verify VoucherScreen offline).
- `test/voucher.test.ts` — TẠO: 3 test (rỗng→null, round-trip, chuỗi rỗng/space→null).

**Test results:**
- `npm test` → ✅ **71 PASS / 0 FAIL / 0 SKIP** (+3 voucher; 5 live RPC + live race vẫn pass). tsc 0 · lint clean · build ✅.
- **Render thật (next dev mock):** `mock=2750&voucher=OPR-TEST-1234` → "Nhận thưởng thành công" + "OPR-TEST-1234" + "Mã voucher" + "Thử lại ngày mai"; passed=1→CLAIM; mock=2750→NEED_QUEST; mock=120→Pha 1 — đều 200.

**Quyết định kỹ thuật (ADR):**
- **VoucherScreen render ƯU TIÊN CAO NHẤT ở SessionView** (trước cả `!status` và COMPLETED). Lý do: sau claim, session COMPLETED → reload, poll trả COMPLETED → màn "Đã hoàn thành" cũ TRỐNG (không có mã). Đọc `claimed_voucher` từ sessionStorage khi mount → hiện lại coupon. Phủ cả 2 ca: vừa claim (state set qua onClaimed) + reload (restore từ storage).
- **Tách VoucherScreen khỏi ClaimPanel** (không để mỗi inline `<Claimed>`): vì restore reload phải render ở SessionView (ClaimPanel chỉ sống ở phase CLAIMABLE, không phải COMPLETED). ClaimPanel giữ `<Claimed>` làm fallback standalone (khi không truyền onClaimed) — không dead.
- **Mock `?voucher=` dev-only** verify coupon offline; restore sessionStorage chỉ chạy real (mock không đọc storage → không nhiễu test phase khác).

**Vấn đề gặp phải:**
- Không có lỗi. Reload-restore tương tác (sessionStorage) verify bằng unit test `lib/voucher` + `?voucher=` render + reasoning (curl không giữ sessionStorage giữa request).

**Task tiếp theo:** T4-1 — Cashier validation page (deps T0-1 ✓) → mở Phase 4
**Bước tiếp theo:** `app/validate/page.tsx` mobile-first: input mã lớn + nút VALIDATE → `validateVoucher` (T4-2); 4 trạng thái (✅ hợp lệ / ❌ chưa claim / ⚠️ đã dùng / ❌ không hợp lệ); tự clear input. MOCK-FIRST trước.

### Session 21 — 2026-06-05 — T4-1 Cashier validation page
**Task:** T4-1 — Cashier validation page  |  **Kết quả:** ✅  (Phase 4 = 1/2 — mở Phase 4 POS Validation)

**Bối cảnh:** Trang cho NHÂN VIÊN quầy (khác luồng khách). T4-1 = UI + MOCK (Invariant #7); validateVoucher action thật + RPC atomic là T4-2.

**Files tạo/sửa:**
- `lib/voucherValidation.ts` — TẠO (pure): types `VoucherResultStatus` (VALID/NOT_CLAIMED/USED/INVALID) + `ValidateVoucherResult` (client+server) + `describeVoucherResult` (→ banner {tone ok/warn/error, title, detail}) + `mockValidateVoucher` (map demo: USED/AVAIL/OPR-XXXX-XXXX/else). Test offline 5.
- `app/validate/page.tsx` — TẠO (server shell + metadata title) → `<Validate>`.
- `app/_components/Validate.tsx` — TẠO (`"use client"`, mobile-first max-w-md): input mã text-2xl mono (autoCapitalize, Enter-submit, autoFocus) + nút "KIỂM TRA" to; banner 4 trạng thái theo tone; hiện giờ REDEEMED (USED); **tự clear input** sau kiểm tra (finally). `const runValidate = mockValidateVoucher` (T4-1) → 1 dòng đổi sang action thật ở T4-2.
- `test/voucherValidation.test.ts` — TẠO: 5 test (describeVoucherResult 4 tone + mockValidateVoucher map 4 trạng thái).

**Test results:**
- `npm test` → ✅ **76 PASS / 0 FAIL / 0 SKIP** (+5; 5 live RPC + race vẫn pass). tsc 0 · lint clean · build ✅ (`/validate` = ○ static 1.57 kB).
- **Render thật (next dev):** `/validate` → HTTP 200 + "Kiểm tra voucher" / "KIỂM TRA" / placeholder "OPR-XXXX-XXXX" / "Nhập mã khách". (Banner kết quả cần click → cover bằng 5 unit test + build.)

**Quyết định kỹ thuật (ADR):**
- **Tách logic thuần `describeVoucherResult` + `mockValidateVoucher` ở lib** (test offline) — UI Validate.tsx mỏng. `ValidateVoucherResult` đặt ở lib để T4-2 action + client cùng dùng (như `lib/claim.ts`).
- **MOCK-FIRST qua `const runValidate = mockValidateVoucher`** — T4-2 chỉ đổi 1 dòng import sang `validateVoucher` server action (không sửa logic UI). Khác `/session` (real+mock theo flag) vì `/validate` chưa có BE cho tới T4-2 → mock toàn phần tạm.
- **Trang POS theme sáng (slate-50)** tách biệt luồng khách (teal gradient) — nhân viên dùng, không cần branding.
- **Date format `toLocaleString('vi-VN')` cho redeemed_at = display-only** (không phải business time → không đụng Invariant #1).

**Vấn đề gặp phải:**
- Không có lỗi. Banner kết quả tương tác (click) không curl được → unit test `describeVoucherResult`/`mockValidateVoucher` + build phủ.

**Task tiếp theo:** T4-2 — validateVoucher Server Action (deps T0-3 ✓, T4-1 ✓)
**Bước tiếp theo:** RPC `validate_voucher` (UPDATE REDEEMED atomic + truy vấn phụ phân biệt AVAILABLE/REDEEMED/không-tồn-tại) + `actions/validateVoucher.ts` map → ValidateVoucherResult; đổi `runValidate` ở Validate.tsx sang action thật. **Test race double-redeem.** User apply schema.sql.

### Session 22 — 2026-06-05 — T4-2 validateVoucher Server Action
**Task:** T4-2 — validateVoucher Server Action  |  **Kết quả:** ✅  (**PHASE 4 HOÀN TẤT 2/2** — POS redeem đầy đủ)

**Bối cảnh:** Đóng Phase 4. T4-1 dùng mock; T4-2 thêm RPC redeem atomic + action thật + wire. Docker daemon chạy → test SQL isolated (function chưa lên Supabase).

**Files tạo/sửa:**
- `supabase/schema.sql` — THÊM `validate_voucher(p_code, p_venue_id)` RETURNS (out_status, out_redeemed_at): UPDATE REDEEMED WHERE RESERVED + (expires_at NULL hoặc > NOW()) RETURNING → FOUND='VALID'; 0 dòng → truy vấn phụ: không tồn tại/hết-hạn→INVALID · AVAILABLE→NOT_CLAIMED · REDEEMED→USED(+redeemed_at). 1 RPC atomic. **CHƯA apply Supabase.**
- `actions/validateVoucher.ts` — TẠO (`"use server"`): trim+UPPER code (khớp seed OPR-XXXX-XXXX hoa); rỗng→INVALID (không chạm DB); venue env; RPC → map `ValidateVoucherResult` (USED kèm redeemedAt).
- `app/_components/Validate.tsx` — SỬA: `runValidate` từ `mockValidateVoucher` → `validateVoucher` thật (1 dòng, đúng kế hoạch MOCK-FIRST T4-1). `mockValidateVoucher` giữ lại (dùng trong test).
- `supabase/tests/validate_voucher_test.sql` — TẠO: 6 nhánh (VALID+chuyển REDEEMED, double-redeem→USED, NOT_CLAIMED, USED, INVALID không-tồn-tại, INVALID hết-hạn không bị redeem). BEGIN/ROLLBACK.
- `test/validateVoucher.test.ts` — TẠO: 1 offline (code rỗng→INVALID) + 1 live RACE (probe-skip; insert RESERVED → 2 validate đồng thời → đúng 1 VALID+1 USED + voucher REDEEMED + idempotent; cleanup code `ZZTEST-RACE`).

**Test results:**
- **Docker SQL (Postgres 16 isolated):** `validate_voucher` **6/6 PASS** ("validate_voucher_test: ALL PASS", exit 0) — gồm double-redeem + hết-hạn-không-redeem.
- `npm test` → ✅ **77 PASS / 0 FAIL / 1 SKIP** (skip = live race tới khi apply schema). tsc 0 · lint clean · build ✅ (`/validate` ○ 1.61 kB).
- **Render thật:** `/validate` HTTP 200 + shell OK sau khi wire action thật.

**Quyết định kỹ thuật (ADR):**
- **Redeem = 1 RPC atomic `UPDATE...WHERE status='RESERVED'...RETURNING`** → chống double-redeem KHÔNG cần lock thủ công: 2 request đồng thời chỉ 1 khớp 'RESERVED' (request kia thấy đã REDEEMED → 0 dòng → USED). Phân loại lý do (NOT_CLAIMED/USED/INVALID) bằng truy vấn phụ trong cùng function.
- **RESERVED nhưng hết hạn → INVALID** (UPDATE không khớp do expires_at; sub-query rơi xuống nhánh cuối) — khớp specs "không tồn tại/hết hạn → ❌". Voucher giữ nguyên RESERVED (không redeem nhầm).
- **Normalize code trim+UPPER ở action** (seed code viết HOA) → cashier gõ thường vẫn khớp. Validate.tsx cũng upper khi nhập.
- **MOCK→real chỉ đổi 1 dòng** (`runValidate`) như thiết kế T4-1 — UI không đổi.

**Vấn đề gặp phải (để session sau không vấp):**
- SQL test lần đầu FAIL nhánh USED: fixture INSERT cột (…, expires_at) nhưng quên set `redeemed_at` cho 'TST-USED' → assert "USED phải có redeemed_at" trượt. **Lỗi FIXTURE, không phải function.** Fix: thêm cột `redeemed_at` vào INSERT (TST-USED = NOW()). → Khi seed voucher REDEEMED thủ công nhớ set redeemed_at.
- tsc TS18047 `row possibly null` (`.single()`) → `row?.status` (pattern lặp từ S8/S10 — cứ `?.` cho `.single()`).
- Docker: `docker run --name opr-pg postgres:16-alpine` + `docker cp` + `psql -f` (PowerShell không `< file`). pg_isready poll trước khi apply.

**Task tiếp theo:** T5-1 — Session resume khi reload (deps T1-2 ✓, T2-2 ✓) → mở Phase 5 Polish
**Bước tiếp theo:** Xác nhận reload `/session?id=` resume đúng phase (poll đã lo) · RUNNING→tiếp tục · COMPLETED→voucher (sessionStorage) hoặc /claim · EXPIRED→landing+message. Phần lớn đã có (T2-2/T3-5) — rà checklist T5-1 + đánh bóng/test còn thiếu.

### Session 23 — 2026-06-05 — T5-1 Session resume khi reload
**Task:** T5-1 — Session resume khi reload  |  **Kết quả:** ✅  (Phase 5 = 1/4 — mở Phase Polish)

**Bối cảnh:** Resume cơ bản đã có (id ở URL + poll quyết phase từ T2-2; COMPLETED→voucher từ T3-5). Gap còn lại theo Context: mở `/session` KHÔNG `?id=` (reload/bookmark/mở lại app) phải khôi phục từ sessionStorage, KHÔNG tạo session mới.

**Files tạo/sửa:**
- `lib/sessionStore.ts` — TẠO (pure/injectable): `readStoredSessionId`/`writeStoredSessionId` + const `SESSION_ID_KEY="session_id"` (khớp Landing). Test offline 3.
- `app/_components/ResumeGate.tsx` — TẠO (`"use client"`): /session không `?id=` → đọc sessionStorage; id hợp lệ → `router.replace('/session?id=<id>')` (resume, KHÔNG createSession) / không có → `router.replace('/')`. Hiện "Đang khôi phục phiên…".
- `app/session/page.tsx` — SỬA: id SAI định dạng → redirect landing (như cũ); id VẮNG → `<ResumeGate>` (thay vì bounce thẳng); id hợp lệ → SessionView. Narrow `id: string` sau guard.
- `app/_components/SessionView.tsx` — SỬA: effect lưu `session_id` vào sessionStorage mỗi khi mount (real) → mở thẳng /session?id=X cũng resume được sau.
- `app/_components/Landing.tsx` — SỬA: dùng `writeStoredSessionId` (thay `setItem` thẳng) cho nhất quán.
- `test/sessionStore.test.ts` — TẠO: 3 test (rỗng→null, round-trip, rỗng/space→null).

**Test results:**
- `npm test` → ✅ **80 PASS / 0 FAIL / 1 SKIP** (skip = validate_voucher live, chờ apply). tsc 0 · lint clean · build ✅ (`/session` 7.2 kB).
- **Render thật (next dev):** `/session` (no id) → 200 + "Đang khôi phục phiên…" (ResumeGate, trước đây 307); `/session?id=not-a-uuid` → 307 landing (rác vẫn chặn); `/session?id=<uuid>&mock=120` → 200 "Pha 1" (không đổi).

**Quyết định kỹ thuật (ADR):**
- **ResumeGate tách riêng (không refactor prop SessionView).** /session?id= vẫn vào SessionView như cũ (sessionId luôn là string từ URL); chỉ ca KHÔNG id mới qua ResumeGate → redirect về dạng chuẩn `/session?id=`. Tránh đổi `sessionId: string` → `null` (sẽ phải guard mọi handler claim/validate). Cô lập thay đổi, không regress.
- **Phân biệt id VẮNG vs id RÁC:** vắng → thử resume (ResumeGate); rác (sai UUID) → redirect landing thẳng (server) tránh vòng lặp. ResumeGate cũng validate stored bằng isValidUuid trước khi redirect.
- **Resume KHÔNG tạo session mới** (Invariant #6): ResumeGate chỉ điều hướng tới id cũ; createSession chỉ chạy ở nút START. Phiên cũ RUNNING → poll resume; COMPLETED → voucher/done; EXPIRED → message.
- **"COMPLETED → /claim" hiểu theo kiến trúc app:** không có route /claim riêng — voucher hiện ngay trong /session (VoucherScreen, T3-5) khi có `claimed_voucher`; COMPLETED không voucher → màn "Đã hoàn thành". Thoả ý "hiện kết quả thưởng khi resume".
- **SessionView lưu session_id mỗi mount** → mở thẳng link /session?id=X (chia sẻ) cũng bật được resume sau này.

**Vấn đề gặp phải:**
- Không có lỗi. ResumeGate redirect là client-side (router.replace trong effect) → curl chỉ thấy shell "khôi phục" (200), không thấy 307 — đúng kỳ vọng (browser chạy effect mới điều hướng).

**Task tiếp theo:** T5-2 — Edge case messages (deps T3-4 ✓, T1-2 ✓)
**Bước tiếp theo:** Rà 3 ca: rate-limit (Landing đã có), pool-empty (ClaimPanel POOL_EMPTY), quest chưa pass (NEED_QUEST) — thống nhất câu chữ theo checklist T5-2; cân nhắc gom `lib/messages.ts`.

### Session 24 — 2026-06-05 — T5-2 Edge case messages
**Task:** T5-2 — Edge case messages  |  **Kết quả:** ✅  (Phase 5 = 2/4)

**Bối cảnh:** Cả 3 message biên đã hiện hữu rải rác (rate-limit T1-3, quest-not-passed T3-1, pool-empty T3-4). T5-2 = gom 1 nguồn + đồng giọng + guard regression.

**Files tạo/sửa:**
- `lib/messages.ts` — TẠO: `MESSAGES` (rateLimited / poolEmpty / questNotPassedInWindow) plain text, 1 nguồn sự thật.
- `app/_components/Landing.tsx` — SỬA: errorMessage RATE_LIMITED → `MESSAGES.rateLimited`.
- `app/_components/ClaimPanel.tsx` — SỬA: `CLAIM_ERROR_MSG.POOL_EMPTY` → `MESSAGES.poolEmpty`; view NEED_QUEST detail → `MESSAGES.questNotPassedInWindow` (bỏ `<b>` inline → plain).
- `test/messages.test.ts` — TẠO: 3 test guard nội dung chính (hôm nay/ngày mai · hết voucher/nhân viên · Blind Box).

**Test results:**
- `npm test` → ✅ **83 PASS / 0 FAIL / 1 SKIP**. tsc 0 · lint clean · build ✅.
- **Render thật (next dev mock=2750):** NEED_QUEST → "Sắp xong" + "Blind Box" + "Sổ Người Lạ" (message centralized OK).

**Quyết định kỹ thuật (ADR):**
- **Gom vào `lib/messages.ts` thay vì sửa câu chữ tại chỗ** — 3 message vốn đã đúng ý checklist; giá trị T5-2 là DRY + đồng giọng + chống lệch về sau. Plain text (mất 1 `<b>` ở NEED_QUEST — chấp nhận, nội dung quan trọng hơn nhấn mạnh).
- **Giữ giọng tiếng Việt** ("thử thách" thay vì literal "challenge" trong checklist) — UX tốt hơn, thoả ý.

**Vấn đề gặp phải:**
- Không có lỗi.

**Task tiếp theo:** T5-3 — Loading + error states (deps tất cả task trên)
**Bước tiếp theo:** `app/loading.tsx` (spinner/skeleton) + `app/error.tsx` (`"use client"` error boundary + nút reset). Rà unhandled promise rejection (actions/fetch đã try/catch).

### Session 25 — 2026-06-05 — T5-3 Loading + error states
**Task:** T5-3 — Loading + error states  |  **Kết quả:** ✅  (Phase 5 = 3/4 — chỉ còn T5-4 smoke test)

**Files tạo/sửa:**
- `app/loading.tsx` — TẠO: route-level loading (spinner `animate-spin` + "Đang tải…"), CSS var `foreground`.
- `app/error.tsx` — TẠO (`"use client"`): root error boundary {error, reset} → "Có lỗi xảy ra" + nút "Thử lại" (`reset()`) + link "Về trang đầu"; `console.error` trong useEffect.
- `app/_components/ClaimPanel.tsx` — SỬA: bọc `runClaim` trong try/catch (defensive — onClaim không reject nhưng phòng unhandled rejection).

**Test results:**
- `npm test` → ✅ **83 PASS / 0 FAIL / 1 SKIP**. tsc 0 · lint clean · `npm run build` ✓ (Next compile loading/error vào bundle).
- **Render thật:** `/` · `/validate` · `/session?mock=120` đều HTTP 200 với error boundary đã thêm (không phá SSR thường).

**Quyết định kỹ thuật (ADR):**
- **loading/error ở ROOT `app/`** đủ cho MVP (áp mọi route) — không cần loading riêng từng segment. error.tsx phải `"use client"` (yêu cầu Next cho error boundary) + nhận `reset()`.
- **Verify qua build + render route thường** (loading hiện lúc suspense, error lúc throw — khó curl trực tiếp; như T2-4 audio). Defensive try/catch runClaim đóng nốt nguồn unhandled rejection tiềm tàng duy nhất ở UI.
- **Audit unhandled rejection:** mọi Server Action (create/validate/claim/verify) try/catch trả object; fetch poll + log-infraction + visibilitychange có `.catch`; BlindBox/BypassForm submit try/catch → sạch.

**Vấn đề gặp phải:**
- Không có lỗi.

**Task tiếp theo:** T5-4 — Smoke test end-to-end (deps tất cả) → task MVP CUỐI
**Bước tiếp theo:** Checklist E2E toàn luồng (landing→START→phases→Blind Box→claim GPS/bypass→voucher→POS validate + double-redeem block) — gom bằng chứng từ test/render đã có; cân nhắc 1 test E2E gộp. Cần user apply schema.sql cho live cuối.

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
| ✅ D-017 | Push GitHub "bị chặn" (Session 4 NGHI corporate firewall) | — | **ĐÓNG (Session 10):** chẩn đoán lại — KHÔNG phải firewall/TLS. `git ls-remote` + `push --dry-run` đều exit 0; remote HTTPS, `credential.helper=manager` (GCM) có creds. User push thật → remote ở `6178af7`. Push hoạt động bình thường; kẹt Session 4 chỉ là GCM chưa auth lần đầu. |
