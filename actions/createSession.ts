"use server";

import { createAdminClient } from "../lib/supabase";
import { isValidUuid } from "../lib/uuid";

export type CreateSessionResult =
  | { ok: true; sessionId: string; startTime: string; resumed: boolean }
  | { ok: false; error: "INVALID_TOKEN" | "RATE_LIMITED" | "SERVER_ERROR" };

interface CreateSessionRow {
  out_session_id: string | null;
  out_start_time: string | null;
  out_resumed: boolean | null;
  out_error: string | null;
}

/**
 * createSession — tạo (hoặc resume) phiên focus cho guest_token ẩn danh. specs §4 Module 1.
 *
 * - `venue_id` lấy từ env `VENUE_ID` (server-authoritative; VENUE_ID là server-only env nên
 *   client KHÔNG truyền vào — single-venue pilot. Multi-venue: thêm param ở V2).
 * - Rate-limit (1 phiên COMPLETED / NGÀY ĐỊA PHƯƠNG theo venue.timezone) + idempotency
 *   (uniq_running_session → resume) + INSERT start_time=NOW() gói trong 1 RPC `create_session`
 *   (atomic, pooler-safe — Invariants #1/#2/#6). Dùng admin client (service_role).
 */
export async function createSession(
  guestToken: string,
): Promise<CreateSessionResult> {
  // Validate UUID trước — KHÔNG chạm env/DB nếu sai (test offline được).
  if (!isValidUuid(guestToken)) {
    return { ok: false, error: "INVALID_TOKEN" };
  }

  const venueId = process.env.VENUE_ID;
  if (!venueId || !isValidUuid(venueId)) {
    console.error("createSession: VENUE_ID env thiếu hoặc không hợp lệ");
    return { ok: false, error: "SERVER_ERROR" };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("create_session", {
      p_guest_token: guestToken,
      p_venue_id: venueId,
    });
    if (error) {
      console.error("createSession RPC error:", error.message);
      return { ok: false, error: "SERVER_ERROR" };
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | CreateSessionRow
      | undefined;
    if (!row) return { ok: false, error: "SERVER_ERROR" };

    if (row.out_error === "RATE_LIMITED") {
      return { ok: false, error: "RATE_LIMITED" };
    }
    if (row.out_error || !row.out_session_id || !row.out_start_time) {
      console.error("createSession kết quả bất thường:", row.out_error);
      return { ok: false, error: "SERVER_ERROR" };
    }

    return {
      ok: true,
      sessionId: row.out_session_id,
      startTime: row.out_start_time,
      resumed: Boolean(row.out_resumed),
    };
  } catch (e) {
    console.error("createSession exception:", e);
    return { ok: false, error: "SERVER_ERROR" };
  }
}
