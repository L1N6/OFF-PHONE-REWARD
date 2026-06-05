/**
 * MESSAGES — copy ca biên dùng chung (specs UX, T5-2). 1 nguồn sự thật để đồng giọng + chống
 * lệch câu chữ giữa các màn. Plain text (client+server an toàn).
 */
export const MESSAGES = {
  // Rate limit: đã hoàn thành hôm nay (Landing — createSession RATE_LIMITED).
  rateLimited: "Bạn đã hoàn thành thử thách hôm nay rồi. Quay lại ngày mai nhé! ☕",
  // Hết voucher (ClaimPanel — claim_voucher POOL_EMPTY).
  poolEmpty: "Hết voucher hôm nay. Hỏi nhân viên để được hỗ trợ nhé!",
  // Tới Giờ Vàng nhưng chưa pass Blind Box (ClaimPanel — view NEED_QUEST).
  questNotPassedInWindow:
    "Bạn cần hoàn thành Blind Box trước đã — mở hộp, đọc Sổ Người Lạ rồi nhập mã để mở khoá nhận thưởng nhé.",
} as const;
