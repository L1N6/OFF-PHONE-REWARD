"use server";

import { createAdminClient } from "../lib/supabase";
import { isValidUuid } from "../lib/uuid";

export type ValidateSubQuestResult =
  | { ok: true; valid: boolean }
  | {
      ok: false;
      error:
        | "INVALID_SESSION"
        | "NO_QUEST_TODAY"
        | "SESSION_NOT_RUNNING"
        | "SERVER_ERROR";
    };

interface ValidateRow {
  out_valid: boolean | null;
  out_error: string | null;
}

/**
 * validateSubQuest — chấm Blind Box sub-quest (specs §3). MVP: code_entry + physical_action.
 *
 * Gói weekday (theo `venue.timezone`) + chọn quest + verify (bcrypt qua pgcrypto) + UPDATE
 * vào 1 RPC `validate_sub_quest` (Invariant #1 weekday-SQL, #2 atomic). `venue_id` từ env
 * `VENUE_ID` (server-authoritative, như createSession). Đáp án KHÔNG bao giờ rời server.
 *
 * - `{ answer }`     → validate quest `code_entry` active hôm nay.
 * - `{ confirmed }`  → validate quest `physical_action` active hôm nay.
 *
 * Trả `{ ok:true, valid }` cho luồng thử-lại (mã sai = `valid:false`); lỗi cứng → `ok:false`.
 */
export async function validateSubQuest(
  sessionId: string,
  input: { answer?: string; confirmed?: boolean },
): Promise<ValidateSubQuestResult> {
  if (!isValidUuid(sessionId)) {
    return { ok: false, error: "INVALID_SESSION" };
  }

  const venueId = process.env.VENUE_ID;
  if (!venueId || !isValidUuid(venueId)) {
    console.error("validateSubQuest: VENUE_ID env thiếu hoặc không hợp lệ");
    return { ok: false, error: "SERVER_ERROR" };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("validate_sub_quest", {
      p_session_id: sessionId,
      p_venue_id: venueId,
      p_answer: input.answer ?? null,
      p_confirmed: input.confirmed ?? false,
    });
    if (error) {
      console.error("validateSubQuest RPC error:", error.message);
      return { ok: false, error: "SERVER_ERROR" };
    }

    const row = (Array.isArray(data) ? data[0] : data) as ValidateRow | undefined;
    if (!row) return { ok: false, error: "SERVER_ERROR" };

    // Pass.
    if (row.out_error === null && row.out_valid) {
      return { ok: true, valid: true };
    }
    // Mã sai → valid:false (UI cho thử lại), KHÔNG phải lỗi cứng.
    if (row.out_error === "WRONG_ANSWER") {
      return { ok: true, valid: false };
    }
    // Lỗi cứng.
    switch (row.out_error) {
      case "NO_QUEST_TODAY":
        return { ok: false, error: "NO_QUEST_TODAY" };
      case "SESSION_NOT_RUNNING":
        return { ok: false, error: "SESSION_NOT_RUNNING" };
      case "SESSION_NOT_FOUND":
      case "VENUE_NOT_FOUND":
        return { ok: false, error: "INVALID_SESSION" };
      default:
        console.error("validateSubQuest kết quả bất thường:", row.out_error);
        return { ok: false, error: "SERVER_ERROR" };
    }
  } catch (e) {
    console.error("validateSubQuest exception:", e);
    return { ok: false, error: "SERVER_ERROR" };
  }
}
