# HISTORY.md — Off-Phone Rewards · Session Log
# Claude đọc file này khi nhận Lệnh 1. Claude ghi vào file này sau Phase D.

═══════════════════════════════════════════════
## 📍 TRẠNG THÁI HIỆN TẠI
═══════════════════════════════════════════════
<!-- Claude cập nhật block này sau MỖI session -->

Cập nhật    : 2026-06-03 (reconcile tài liệu, chưa code)
Task đang làm: T0-1 — Initialize Next.js project
Bước tiếp theo: Chạy npx create-next-app với --typescript --tailwind --app --eslint
Task kế tiếp : T0-2 — Supabase client setup
MVP tiến độ  : 0 / 25 tasks hoàn thành

═══════════════════════════════════════════════
## TIẾN ĐỘ
═══════════════════════════════════════════════

| Phase | Tasks | Xong | % |
|---|---|---|---|
| Phase 0: Setup | 4 | 0 | 0% |
| Phase 1: Session Auth | 3 | 0 | 0% |
| Phase 2: Timer, Phases & Blind Box | 7 | 0 | 0% |
| Phase 3: Claim & Voucher | 5 | 0 | 0% |
| Phase 4: POS Validation | 2 | 0 | 0% |
| Phase 5: Polish | 4 | 0 | 0% |
| **Tổng MVP** | **25** | **0** | **0%** |

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
