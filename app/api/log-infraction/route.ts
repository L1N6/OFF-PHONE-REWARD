import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "../../../lib/supabase";
import { isValidUuid } from "../../../lib/uuid";

/**
 * POST /api/log-infraction  — specs §4 Module 2 (visibilitychange).
 * Body `{ id }` (hoặc `?id=`). INCREMENT `infraction_count` nguyên tử qua RPC `log_infraction`
 * (chỉ phiên RUNNING). Trả `{ infraction_count }` (count mới; -1 nếu phiên không RUNNING/không
 * tồn tại). MVP KHÔNG auto-fail. Dùng admin client.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let id: string | null = null;
  try {
    const body = (await req.json()) as { id?: unknown };
    if (typeof body?.id === "string") id = body.id;
  } catch {
    // body rỗng/không JSON → thử query param
  }
  if (!id) id = req.nextUrl.searchParams.get("id");

  if (!id || !isValidUuid(id)) {
    return NextResponse.json({ error: "INVALID_SESSION_ID" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("log_infraction", {
      p_session_id: id,
    });
    if (error) {
      console.error("log-infraction RPC error:", error.message);
      return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }
    const count = typeof data === "number" ? data : -1;
    return NextResponse.json(
      { infraction_count: count },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("log-infraction exception:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
