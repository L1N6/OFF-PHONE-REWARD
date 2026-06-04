"use server";

import { createAdminClient } from "../lib/supabase";
import { isValidUuid } from "../lib/uuid";
import type { ActiveQuest } from "../lib/quests";

/**
 * getActiveQuests — quest Blind Box active HÔM NAY (specs §3).
 *
 * Weekday tính bằng SQL theo `venue.timezone` (Invariant #1) + strip `answer_hash` ngay
 * trong RPC `get_active_quests` (đáp án KHÔNG rời server). `venue_id` từ env. Gọi từ client
 * khi vào Phase 2 (server action). Lỗi/chưa apply → trả `[]` (UI hiện "hôm nay không có NV").
 */
export async function getActiveQuests(): Promise<ActiveQuest[]> {
  const venueId = process.env.VENUE_ID;
  if (!venueId || !isValidUuid(venueId)) {
    console.error("getActiveQuests: VENUE_ID env thiếu hoặc không hợp lệ");
    return [];
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_active_quests", {
      p_venue_id: venueId,
    });
    if (error) {
      console.error("getActiveQuests RPC error:", error.message);
      return [];
    }
    return (Array.isArray(data) ? data : []) as ActiveQuest[];
  } catch (e) {
    console.error("getActiveQuests exception:", e);
    return [];
  }
}
