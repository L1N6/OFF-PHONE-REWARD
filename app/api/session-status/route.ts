import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "../../../lib/supabase";
import { isValidUuid } from "../../../lib/uuid";
import {
  deriveSessionStatus,
  type SessionDbStatus,
} from "../../../lib/sessionStatus";

/**
 * GET /api/session-status?id=<session_uuid>  — specs §4 Module 2.
 *
 * Server timer & phase machine. Δt + lazy-expiry tính trong RPC `get_session_status`
 * (Postgres NOW() — Invariant #1/#2 server-time + atomic). Route chỉ map phase + cờ
 * claim-window (pure, `lib/sessionStatus`) rồi trả JSON. FE poll mỗi 30s, tick local
 * giữa 2 poll (specs §4 Module 2). Dùng admin client (service_role).
 *
 *   400 INVALID_SESSION_ID — thiếu / không phải UUID (không chạm DB)
 *   404 SESSION_NOT_FOUND  — UUID hợp lệ nhưng không có phiên
 *   500 SERVER_ERROR       — RPC / env lỗi
 *   200 { delta_seconds, phase, status, sub_quest_passed, claim_window_open, claim_window_expired }
 */
export const dynamic = "force-dynamic"; // poll → luôn hỏi server time mới, không static

interface SessionStatusRow {
  out_delta_seconds: number;
  out_status: SessionDbStatus;
  out_sub_quest_passed: boolean;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !isValidUuid(id)) {
    return NextResponse.json({ error: "INVALID_SESSION_ID" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_session_status", {
      p_session_id: id,
    });
    if (error) {
      console.error("session-status RPC error:", error.message);
      return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }

    // RPC trả 0 dòng khi session không tồn tại → 404 (specs/todo T2-1).
    const row = (Array.isArray(data) ? data[0] : data) as
      | SessionStatusRow
      | undefined;
    if (!row) {
      return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
    }

    const body = deriveSessionStatus(
      row.out_delta_seconds,
      row.out_status,
      row.out_sub_quest_passed,
    );
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("session-status exception:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
