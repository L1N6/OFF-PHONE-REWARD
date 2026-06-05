"use server";

import { createAdminClient } from "../lib/supabase";
import { isValidUuid } from "../lib/uuid";
import type {
  ValidateVoucherResult,
  VoucherResultStatus,
} from "../lib/voucherValidation";

interface ValidateVoucherRow {
  out_status: string;
  out_redeemed_at: string | null;
}

/**
 * validateVoucher — POS redeem cho nhân viên quầy (specs §4 Module 4, T4-2).
 *
 * Gói UPDATE REDEEMED nguyên tử + phân loại lý do trong 1 RPC `validate_voucher` (atomic,
 * chống double-redeem race — Invariant #2). `venue_id` từ env (server-authoritative). Code
 * chuẩn hoá trim+UPPER (khớp seed `OPR-XXXX-XXXX` viết hoa). Trả `ValidateVoucherResult`:
 *   VALID (đã redeem) · NOT_CLAIMED (AVAILABLE) · USED (REDEEMED, +redeemedAt) · INVALID.
 */
export async function validateVoucher(
  code: string,
): Promise<ValidateVoucherResult> {
  const trimmed = (code ?? "").trim().toUpperCase();
  if (trimmed.length === 0) return { ok: true, status: "INVALID" };

  const venueId = process.env.VENUE_ID;
  if (!venueId || !isValidUuid(venueId)) {
    console.error("validateVoucher: VENUE_ID env thiếu/không hợp lệ");
    return { ok: false, error: "SERVER_ERROR" };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("validate_voucher", {
      p_code: trimmed,
      p_venue_id: venueId,
    });
    if (error) {
      console.error("validateVoucher RPC error:", error.message);
      return { ok: false, error: "SERVER_ERROR" };
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | ValidateVoucherRow
      | undefined;
    if (!row) return { ok: false, error: "SERVER_ERROR" };

    const status = row.out_status as VoucherResultStatus;
    if (status === "USED") {
      return { ok: true, status: "USED", redeemedAt: row.out_redeemed_at ?? undefined };
    }
    if (status === "VALID" || status === "NOT_CLAIMED" || status === "INVALID") {
      return { ok: true, status };
    }
    console.error("validateVoucher kết quả bất thường:", row.out_status);
    return { ok: false, error: "SERVER_ERROR" };
  } catch (e) {
    console.error("validateVoucher exception:", e);
    return { ok: false, error: "SERVER_ERROR" };
  }
}
