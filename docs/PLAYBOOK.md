# PLAYBOOK.md — Orchestrator
# Off-Phone Rewards · 2 lệnh → 4 phases tự động

═══════════════════════════════════════════════
## 2 LỆNH DUY NHẤT
═══════════════════════════════════════════════

LỆNH 1 — Đầu mỗi session (copy nguyên):
┌──────────────────────────────────────────────┐
│ Read @docs/PLAYBOOK.md và @docs/HISTORY.md   │
│ Báo cáo lịch sử và trạng thái hiện tại.     │
│ Sau khi tôi nói OK thì làm tiếp và tự lưu   │
│ lịch sử chi tiết vào HISTORY.md khi xong.   │
└──────────────────────────────────────────────┘

LỆNH 2 — Sau khi đọc báo cáo:
┌──────────────────────────────────────────────┐
│ OK                                            │
└──────────────────────────────────────────────┘

Kết thúc: /exit
Commit:   git add docs/ && git commit -m "session: [TASK ID] done"

═══════════════════════════════════════════════
## KHI NHẬN LỆNH 1
═══════════════════════════════════════════════

Đọc @docs/HISTORY.md. Trả về đúng format này, không làm gì thêm:

---
## 📊 Báo cáo — [ngày hôm nay]

### Đã hoàn thành
[Task [x] từ HISTORY.md — ID + tên + ngày]

### Đang làm
Task [ID]: [tên] — [trạng thái]

### Bước tiếp theo
[Lấy từ "Bước tiếp theo" trong HISTORY.md — cụ thể, không chung chung]

### Lưu ý từ session trước
[Vấn đề/quyết định quan trọng từ SESSION LOG gần nhất]
---

Kết thúc: "Sẵn sàng. Gõ OK để bắt đầu." → DỪNG, chờ OK.

═══════════════════════════════════════════════
## KHI NHẬN OK — 4 PHASES
═══════════════════════════════════════════════

Chạy tuần tự A → B → C → D. Không skip phase nào.

──────────────────────────────────────────────
PHASE A · PLAN
──────────────────────────────────────────────
Đọc theo thứ tự:
1. @CLAUDE.md          → 8 invariants + cấu trúc project
2. @docs/specs.md      → business logic của task này
3. @docs/todo.md       → tìm Task ID → đọc Context, Deps, Checklist

Nếu task có >10 bước: ghi plan ra docs/scratch/current-plan.md
Nếu task đơn giản: giữ plan trong memory.

Thông báo: "✦ Plan xong → bắt đầu code..." (tiếp tục ngay)

──────────────────────────────────────────────
PHASE B · CODE
──────────────────────────────────────────────
- Đọc file thật trước khi sửa — không assume nội dung
- Implement từng bước trong Checklist theo thứ tự
- FE task: mock data trước, KHÔNG wire BE thật (Invariant #7)
- Viết test cases → chạy test → FAIL thì fix ngay
- Thông báo progress ngắn sau mỗi bước lớn

──────────────────────────────────────────────
PHASE C · VALIDATE
──────────────────────────────────────────────
Đọc lại @docs/specs.md. Check theo thứ tự:
1. Business rules đúng với specs?
2. 8 Invariants từ @CLAUDE.md: vi phạm → quay Phase B sửa
3. Checklist trong todo.md: tất cả đã tick?

Không được chuyển Phase D khi còn vi phạm.

──────────────────────────────────────────────
PHASE D · SAVE
──────────────────────────────────────────────
Làm 2 việc theo thứ tự:

① @docs/todo.md
  → Đổi [ ] thành [x] cho task vừa xong
  → Cập nhật bảng tiến độ (số task done, %)

② @docs/HISTORY.md — cập nhật 2 chỗ:

  [TRẠNG THÁI HIỆN TẠI]
  Cập nhật    : [ngày hôm nay]
  Task đang làm: [ID KẾ TIẾP] — [tên]
  Bước tiếp theo: [bước ĐẦU TIÊN cụ thể của task kế tiếp]
  MVP tiến độ  : [N] / 25 tasks hoàn thành

  [SESSION LOG — thêm block mới]
  ### Session [N] — [ngày]
  **Task:** [ID] — [tên]  |  **Kết quả:** ✅ / 🔄

  **Files tạo/sửa:**
  - path/to/file — [tạo mới: làm gì / sửa: thay đổi gì]

  **Test results:**
  - [tên test]: ✅ PASS / ❌ FAIL

  **Quyết định kỹ thuật:**
  - [Nếu làm khác spec → ghi lý do]

  **Vấn đề gặp phải:**
  - [Lỗi X → giải quyết Y — để session sau không lặp lại]

  **Task tiếp theo:** [ID] — [tên]
  **Bước tiếp theo:** [bước đầu tiên cụ thể]

Xoá docs/scratch/ nếu có file tạm.
Kết thúc: "✅ [TASK ID] xong. Lịch sử đã lưu. Gõ /exit."
