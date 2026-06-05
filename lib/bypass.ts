import { createHash, timingSafeEqual } from "node:crypto";

/**
 * So sánh chuỗi CONSTANT-TIME (chống timing attack) — specs §4 Module 3 (T3-3).
 *
 * Hash SHA-256 cả hai input về cùng 32 byte RỒI `timingSafeEqual`:
 *   • `timingSafeEqual` throw nếu hai buffer lệch độ dài → hash về cùng độ dài để không throw
 *     và KHÔNG leak độ dài mã thật qua thời gian/exception.
 *   • Thời gian so sánh không phụ thuộc nội dung → không leak vị trí ký tự sai.
 *
 * CHỈ dùng ở server (node:crypto) — so `CASHIER_BYPASS_CODE` env, không bao giờ ra client.
 * Lưu ý: KHÔNG phải so sánh bí mật cao cấp (mã tĩnh, pilot có nhân viên tại quầy — D-004);
 * 🟡 Fast-follow thay bằng OTP động.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}
