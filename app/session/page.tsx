import { redirect } from "next/navigation";
import { isValidUuid } from "../../lib/uuid";
import { SessionView } from "../_components/SessionView";
import { ResumeGate } from "../_components/ResumeGate";

/**
 * /session?id=<uuid>  — trang phiên focus (specs §4 Module 2).
 * Server shell: đọc `id`, validate UUID → sai/thiếu thì redirect landing (checklist T2-2).
 * Tương tác (poll, countdown, phase) ở client `<SessionView>`.
 */
export const dynamic = "force-dynamic";

export default function SessionPage({
  searchParams,
}: {
  searchParams: { id?: string; mock?: string; passed?: string; voucher?: string };
}) {
  const id = searchParams.id;
  // id có nhưng SAI định dạng → rác → về landing.
  if (id !== undefined && !isValidUuid(id)) {
    redirect("/");
  }
  // id VẮNG → thử khôi phục từ sessionStorage (T5-1), không bounce thẳng về landing.
  if (id === undefined) {
    return <ResumeGate />;
  }

  // Mock CHỈ ở dev để verify UI mọi phase offline (không có live session):
  //   /session?id=<uuid>&mock=<delta_seconds>   (vd mock=120 → Phase 1, mock=2750 → CLAIMABLE)
  //   thêm &passed=1 → giả lập đã pass Blind Box (verify nút CLAIM ở Giờ Vàng — T3-1).
  //   thêm &voucher=<code> → giả lập đã nhận voucher (verify VoucherScreen — T3-5).
  const isDev = process.env.NODE_ENV !== "production";
  let mockDelta: number | undefined;
  if (isDev && searchParams.mock != null) {
    const n = Number(searchParams.mock);
    if (Number.isFinite(n)) mockDelta = n;
  }
  const mockPassed = isDev && searchParams.passed === "1";
  const mockVoucher =
    isDev && searchParams.voucher ? searchParams.voucher : undefined;

  return (
    <SessionView
      sessionId={id}
      mockDelta={mockDelta}
      mockPassed={mockPassed}
      mockVoucher={mockVoucher}
    />
  );
}
