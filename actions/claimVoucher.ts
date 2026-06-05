"use server";

import { createAdminClient } from "../lib/supabase";
import { isValidUuid } from "../lib/uuid";
import { haversineMeters } from "../lib/haversine";
import { safeEqual } from "../lib/bypass";
import type {
  ClaimPresence,
  ClaimVoucherResult,
} from "../lib/claim";

interface ClaimRow {
  out_code: string | null;
  out_error: string | null;
}

/**
 * claimVoucher — khâu nguyên tử cuối của luồng nhận thưởng (specs §2 + §4 Module 3, T3-4).
 *
 * Trình tự (specs §4 Module 3): validate PRESENCE (GPS Haversine HOẶC bypass) → RPC `claim_voucher`.
 * - PRESENCE check ở Server Action (KHÔNG tin client; bypass RE-VERIFY bằng `safeEqual`, GPS so
 *   `venue.radius_meters` bằng Haversine — toạ độ tính rồi DISCARD, không lưu).
 * - Cấp voucher trong 1 RPC `claim_voucher(session_id, venue_id)`: atomic re-check Giờ Vàng (SQL
 *   NOW(), Invariant #1), gate `sub_quest_passed`, FOR UPDATE + uniq_voucher_per_session chống race
 *   (Invariant #2/#6) → idempotent (session đã có voucher → trả code cũ). KHÔNG BEGIN/COMMIT ở Node.
 * - `venue_id` từ env (server-authoritative). Map lỗi RPC → message thân thiện (FE).
 */
export async function claimVoucher(
  sessionId: string,
  presence: ClaimPresence,
): Promise<ClaimVoucherResult> {
  if (!isValidUuid(sessionId)) return { ok: false, error: "INVALID_SESSION" };

  const venueId = process.env.VENUE_ID;
  if (!venueId || !isValidUuid(venueId)) {
    console.error("claimVoucher: VENUE_ID env thiếu/không hợp lệ");
    return { ok: false, error: "SERVER_ERROR" };
  }

  try {
    const admin = createAdminClient();

    // (1) PRESENCE — server-authoritative (KHÔNG tin cờ "đã verify" từ client).
    const present = await verifyPresence(admin, venueId, presence);
    if (!present) return { ok: false, error: "PRESENCE_FAILED" };

    // (2) Cấp voucher nguyên tử (RPC §2: re-check window + gate quest + COMPLETED + idempotent).
    const { data, error } = await admin.rpc("claim_voucher", {
      p_session_id: sessionId,
      p_venue_id: venueId,
    });
    if (error) {
      console.error("claimVoucher RPC error:", error.message);
      return { ok: false, error: "SERVER_ERROR" };
    }

    const row = (Array.isArray(data) ? data[0] : data) as ClaimRow | undefined;
    if (!row) return { ok: false, error: "SERVER_ERROR" };

    if (row.out_error === null && row.out_code) {
      return { ok: true, code: row.out_code };
    }
    switch (row.out_error) {
      case "QUEST_NOT_PASSED":
        return { ok: false, error: "QUEST_NOT_PASSED" };
      case "OUTSIDE_WINDOW":
        return { ok: false, error: "OUTSIDE_WINDOW" };
      case "SESSION_NOT_RUNNING":
        return { ok: false, error: "SESSION_NOT_RUNNING" };
      case "POOL_EMPTY":
        return { ok: false, error: "POOL_EMPTY" };
      case "SESSION_NOT_FOUND":
        return { ok: false, error: "INVALID_SESSION" };
      default:
        console.error("claimVoucher kết quả bất thường:", row.out_error);
        return { ok: false, error: "SERVER_ERROR" };
    }
  } catch (e) {
    console.error("claimVoucher exception:", e);
    return { ok: false, error: "SERVER_ERROR" };
  }
}

/**
 * Validate presence tại quán (KHÔNG export — "use server" chỉ export async fn; helper nội bộ OK).
 * - bypass: re-verify constant-time với env `CASHIER_BYPASS_CODE`.
 * - GPS: Haversine(toạ độ, venue.lat/lng) ≤ `venue.radius_meters`. Toạ độ discard sau khi tính.
 */
async function verifyPresence(
  admin: ReturnType<typeof createAdminClient>,
  venueId: string,
  presence: ClaimPresence,
): Promise<boolean> {
  if ("bypassCode" in presence) {
    const expected = process.env.CASHIER_BYPASS_CODE;
    if (!expected) {
      console.error("claimVoucher: CASHIER_BYPASS_CODE env chưa set");
      return false;
    }
    const input = (presence.bypassCode ?? "").trim();
    return input.length > 0 && safeEqual(input, expected);
  }

  const { data, error } = await admin
    .from("venues")
    .select("latitude, longitude, radius_meters")
    .eq("id", venueId)
    .single();
  if (error || !data) {
    console.error("claimVoucher: không đọc được venue", error?.message);
    return false;
  }
  const d = haversineMeters(
    presence.lat,
    presence.lng,
    data.latitude,
    data.longitude,
  );
  return d <= data.radius_meters;
}
