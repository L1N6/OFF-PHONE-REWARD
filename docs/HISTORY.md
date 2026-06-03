# HISTORY.md — Off-Phone Rewards · Session Log
# Claude đọc file này khi nhận Lệnh 1. Claude ghi vào file này sau Phase D.

═══════════════════════════════════════════════
## 📍 TRẠNG THÁI HIỆN TẠI
═══════════════════════════════════════════════
<!-- Claude cập nhật block này sau MỖI session -->

Cập nhật    : 2026-06-03 (T0-1 done — scaffold Next.js 14)
Task đang làm: T0-2 — Supabase client setup
Bước tiếp theo: `npm install @supabase/supabase-js` → tạo `lib/supabase.ts` export `createPublicClient()` + `createAdminClient()` (admin throw nếu chạy client-side, trỏ pooler 6543)
Task kế tiếp : T0-3 — Database schema + seed (đầy đủ, scale-ready)
MVP tiến độ  : 1 / 25 tasks hoàn thành

═══════════════════════════════════════════════
## TIẾN ĐỘ
═══════════════════════════════════════════════

| Phase | Tasks | Xong | % |
|---|---|---|---|
| Phase 0: Setup | 4 | 1 | 25% |
| Phase 1: Session Auth | 3 | 0 | 0% |
| Phase 2: Timer, Phases & Blind Box | 7 | 0 | 0% |
| Phase 3: Claim & Voucher | 5 | 0 | 0% |
| Phase 4: POS Validation | 2 | 0 | 0% |
| Phase 5: Polish | 4 | 0 | 0% |
| **Tổng MVP** | **25** | **1** | **4%** |

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
