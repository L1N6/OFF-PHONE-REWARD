/**
 * POS validation — types + map kết quả → hiển thị (specs §4 Module 4, T4-1). PURE, test offline.
 * Cấp voucher REDEEMED atomic là T4-2 (`validateVoucher` server action); ở đây chỉ là kiểu chung
 * + mock cho UI (MOCK-FIRST, Invariant #7) + hàm thuần map trạng thái → banner.
 */

export type VoucherResultStatus = "VALID" | "NOT_CLAIMED" | "USED" | "INVALID";

export type ValidateVoucherResult =
  | { ok: true; status: VoucherResultStatus; redeemedAt?: string }
  | { ok: false; error: string };

export interface VoucherResultView {
  tone: "ok" | "warn" | "error";
  title: string;
  detail: string;
}

/** Map kết quả validate → nội dung banner (specs §4 Module 4). Pure. */
export function describeVoucherResult(r: ValidateVoucherResult): VoucherResultView {
  if (!r.ok) {
    return { tone: "error", title: "⚠️ Lỗi hệ thống", detail: "Thử lại giúp mình nhé." };
  }
  switch (r.status) {
    case "VALID":
      return { tone: "ok", title: "✅ Hợp lệ — Giảm 10%", detail: "Áp dụng giảm giá cho khách." };
    case "USED":
      return { tone: "warn", title: "⚠️ Đã sử dụng", detail: "Voucher này đã được dùng trước đó." };
    case "NOT_CLAIMED":
      return { tone: "error", title: "❌ Chưa được nhận", detail: "Mã chưa qua bước nhận thưởng." };
    case "INVALID":
      return { tone: "error", title: "❌ Không hợp lệ", detail: "Mã không tồn tại hoặc đã hết hạn." };
  }
}

/**
 * MOCK validate (T4-1) — verify UI offline trước khi có `validateVoucher` thật (T4-2).
 * Quy ước demo: chứa "USED" → đã dùng · chứa "AVAIL" → chưa claim · đúng dạng OPR-XXXX-XXXX → hợp lệ
 * · còn lại → không hợp lệ.
 */
export async function mockValidateVoucher(
  code: string,
): Promise<ValidateVoucherResult> {
  const c = code.trim().toUpperCase();
  if (c.includes("USED")) {
    return { ok: true, status: "USED", redeemedAt: "2026-06-05T09:30:00.000Z" };
  }
  if (c.includes("AVAIL")) return { ok: true, status: "NOT_CLAIMED" };
  if (/^OPR-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)) {
    return { ok: true, status: "VALID" };
  }
  return { ok: true, status: "INVALID" };
}
