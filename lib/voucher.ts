/**
 * Lưu/đọc voucher đã nhận ở sessionStorage (specs §4 Module 3, T3-5) — PURE/injectable, test offline.
 * Restore khi reload: phiên đã COMPLETED → poll trả COMPLETED → đọc lại mã từ đây để hiện coupon
 * thay vì màn "đã hoàn thành" trống.
 */

export const CLAIMED_VOUCHER_KEY = "claimed_voucher";

export function readClaimedVoucher(
  storage: Pick<Storage, "getItem">,
): string | null {
  const v = storage.getItem(CLAIMED_VOUCHER_KEY);
  return v && v.trim().length > 0 ? v : null;
}

export function writeClaimedVoucher(
  storage: Pick<Storage, "setItem">,
  code: string,
): void {
  storage.setItem(CLAIMED_VOUCHER_KEY, code);
}
