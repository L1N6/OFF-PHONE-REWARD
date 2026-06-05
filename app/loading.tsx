/**
 * Route-level loading UI (Next App Router, T5-3). Hiện khi điều hướng/Server Component đang tải.
 * Spinner gọn, giọng nhẹ nhàng; dùng CSS var `foreground` (khớp theme app).
 */
export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-foreground/20 border-t-foreground/70"
        aria-hidden
      />
      <p className="text-sm text-foreground/60">Đang tải…</p>
    </main>
  );
}
