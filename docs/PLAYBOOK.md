# PLAYBOOK.md — Orchestrator
# Off-Phone Rewards · 4 lệnh → tự động hóa mọi luồng

═══════════════════════════════════════════════
## 4 LỆNH
═══════════════════════════════════════════════

LỆNH 0 — Chỉ xem lịch sử (không implement):
┌──────────────────────────────────────────────┐
│ Tóm tắt @docs/HISTORY.md                    │
└──────────────────────────────────────────────┘

LỆNH 1 — Đầu mỗi session (copy nguyên):
┌──────────────────────────────────────────────┐
│ Read @docs/PLAYBOOK.md và @docs/HISTORY.md   │
│ Báo cáo lịch sử và trạng thái hiện tại.     │
│ Sau khi tôi nói OK thì làm tiếp và tự lưu   │
│ lịch sử chi tiết vào HISTORY.md khi xong.   │
└──────────────────────────────────────────────┘

LỆNH 2 — Sau khi đọc báo cáo (implement task tiếp theo):
┌──────────────────────────────────────────────┐
│ OK                                            │
└──────────────────────────────────────────────┘

LỆNH 3 — Khi có yêu cầu mới (chưa có trong todo.md):
┌──────────────────────────────────────────────┐
│ Tôi có yêu cầu mới: [mô tả ngắn gọn]        │
└──────────────────────────────────────────────┘

Kết thúc: /exit
Commit:   git add docs/ && git commit -m "session: [TASK ID] done"

═══════════════════════════════════════════════
## KHI NHẬN LỆNH 0
═══════════════════════════════════════════════

Đọc @docs/HISTORY.md. Trả về báo cáo ngắn:
- **Đã hoàn thành:** [list task + ngày gần nhất]
- **Đang làm / bước tiếp theo:** [lấy từ TRẠNG THÁI HIỆN TẠI]
- **Lưu ý nổi bật:** [vấn đề/quyết định quan trọng từ session cuối]

DỪNG hoàn toàn — không hỏi OK, không implement gì.

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
4. @docs/ADR.md        → quyết định kỹ thuật liên quan (nếu có)

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
4. Có quyết định kỹ thuật mới → ghi vào ADR.md không?

Không được chuyển Phase D khi còn vi phạm.

──────────────────────────────────────────────
PHASE D · SAVE
──────────────────────────────────────────────
Làm theo thứ tự:

① @docs/todo.md
  → Đổi [ ] thành [x] cho task vừa xong
  → Cập nhật bảng tiến độ (số task done, %)

② @docs/ADR.md — nếu có quyết định kỹ thuật không hiển nhiên:
  → Thêm ADR-NNN mới ở cuối file (trước section "Thêm ADR mới")

③ @docs/HISTORY.md — cập nhật 2 chỗ:

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
  - [Nếu làm khác spec → ghi lý do] [→ ADR-NNN nếu đã thêm]

  **Vấn đề gặp phải:**
  - [Lỗi X → giải quyết Y — để session sau không lặp lại]

  **Task tiếp theo:** [ID] — [tên]
  **Bước tiếp theo:** [bước đầu tiên cụ thể]

Xoá docs/scratch/ nếu có file tạm.
Kết thúc: "✅ [TASK ID] xong. Lịch sử đã lưu. Gõ /exit."

═══════════════════════════════════════════════
## KHI NHẬN "Tôi có yêu cầu mới: ..." — INTAKE FLOW
═══════════════════════════════════════════════

Chạy tuần tự R1 → R2 → R3. DỪNG sau R2, chờ user duyệt.

──────────────────────────────────────────────
PHASE R1 · RESEARCH
──────────────────────────────────────────────
Đọc theo thứ tự:
1. @docs/off-phone-rewards-PRD-v3.1.md → tầm nhìn sản phẩm có hỗ trợ không?
2. @docs/specs.md                      → schema/logic hiện tại có cần mở rộng gì?
3. @docs/ADR.md                        → quyết định cũ nào liên quan?
4. @docs/BACKLOG.md                    → đã có entry tương tự chưa?
5. @docs/todo.md                       → deps cần xong trước?

──────────────────────────────────────────────
PHASE R2 · DRAFT
──────────────────────────────────────────────
Tạo entry [RQ-xxx] trong @docs/BACKLOG.md theo template:
- Vấn đề / nhu cầu (diễn đạt lại rõ ràng)
- Giải pháp đề xuất (UX + logic ngắn gọn)
- Acceptance criteria (3–5 điểm cụ thể)
- Ràng buộc kỹ thuật (ADR liên quan)
- Câu hỏi mở cần chốt
- Deps (task nào phải xong trước)
- Specs thay đổi (section nào trong specs.md)

Thông báo: "✦ Draft xong. Xem BACKLOG.md và cho biết OK hoặc điều chỉnh." → DỪNG.

──────────────────────────────────────────────
PHASE R3 · GRADUATE (sau khi user duyệt OK)
──────────────────────────────────────────────
1. Cập nhật @docs/specs.md: thêm schema/logic mới nếu cần
2. Tạo task mới trong @docs/todo.md (Fast-follow hoặc V2) với Checklist đầy đủ
3. Cập nhật entry BACKLOG.md: status → "ready", ghi "→ Tasks: [IDs]"
4. Cập nhật @docs/HISTORY.md (Session LOG ngắn: intake done)
Kết thúc: "✅ Yêu cầu đã graduate → [task IDs]. Gõ OK để bắt đầu implement."
