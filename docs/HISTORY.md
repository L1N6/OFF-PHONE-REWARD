# HISTORY.md — Off-Phone Rewards · Session Log
# Claude đọc file này khi nhận Lệnh 1. Claude ghi vào file này sau Phase D.

═══════════════════════════════════════════════
## 📍 TRẠNG THÁI HIỆN TẠI
═══════════════════════════════════════════════
<!-- Claude cập nhật block này sau MỖI session -->

Cập nhật    : 2026-06-04 (T0-3 done — schema + seed + claim_voucher, test trên PG16 Docker)
Task đang làm: T0-4 — Vercel deployment
Bước tiếp theo: Tạo Supabase project → SQL Editor chạy `supabase/schema.sql` rồi `supabase/seed.sql` → lấy URL + anon + service_role key + connection string pooler(6543) → set env Vercel & `.env.local` (VENUE_ID=11111111-…-111111111111, CASHIER_BYPASS_CODE) → link Vercel, confirm auto-deploy main → chạy lại `npm test` (kỳ vọng 6 PASS, 0 SKIP — đóng D-014)
Task kế tiếp : T1-1 — useGuestToken hook
MVP tiến độ  : 3 / 25 tasks hoàn thành

═══════════════════════════════════════════════
## TIẾN ĐỘ
═══════════════════════════════════════════════

| Phase | Tasks | Xong | % |
|---|---|---|---|
| Phase 0: Setup | 4 | 3 | 75% |
| Phase 1: Session Auth | 3 | 0 | 0% |
| Phase 2: Timer, Phases & Blind Box | 7 | 0 | 0% |
| Phase 3: Claim & Voucher | 5 | 0 | 0% |
| Phase 4: POS Validation | 2 | 0 | 0% |
| Phase 5: Polish | 4 | 0 | 0% |
| **Tổng MVP** | **25** | **3** | **12%** |

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
| D-014 | Live-connect test (`test/supabase.test.ts`) skip vì chưa có Supabase creds | Thấp (factory đã test) | Chạy lại `npm test` sau khi T0-4 set `.env.local` — phải thấy 6 PASS, 0 SKIP |
| D-015 | Schema/seed mới chỉ apply trên Postgres 16 Docker, chưa lên Supabase thật | Thấp (engine giống, đã test đủ nhánh + race) | T0-4: SQL Editor chạy `schema.sql`+`seed.sql`; xác minh `crypt()` resolve (search_path extensions) + 20 voucher + venue |
