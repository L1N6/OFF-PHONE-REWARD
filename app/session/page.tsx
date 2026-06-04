import { redirect } from "next/navigation";
import { isValidUuid } from "../../lib/uuid";
import { SessionView } from "../_components/SessionView";

/**
 * /session?id=<uuid>  — trang phiên focus (specs §4 Module 2).
 * Server shell: đọc `id`, validate UUID → sai/thiếu thì redirect landing (checklist T2-2).
 * Tương tác (poll, countdown, phase) ở client `<SessionView>`.
 */
export const dynamic = "force-dynamic";

export default function SessionPage({
  searchParams,
}: {
  searchParams: { id?: string; mock?: string };
}) {
  const id = searchParams.id;
  if (!id || !isValidUuid(id)) {
    redirect("/");
  }

  // Mock CHỈ ở dev để verify UI mọi phase offline (không có live session):
  //   /session?id=<uuid>&mock=<delta_seconds>   (vd mock=120 → Phase 1, mock=2750 → CLAIMABLE)
  let mockDelta: number | undefined;
  if (process.env.NODE_ENV !== "production" && searchParams.mock != null) {
    const n = Number(searchParams.mock);
    if (Number.isFinite(n)) mockDelta = n;
  }

  return <SessionView sessionId={id} mockDelta={mockDelta} />;
}
