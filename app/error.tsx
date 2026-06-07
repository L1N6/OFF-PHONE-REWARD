"use client";

import { useEffect } from "react";

/**
 * Root error boundary (Next App Router, T5-3). Bắt lỗi render/Server Component không lường trước
 * → màn thân thiện + nút "Thử lại" (`reset()` render lại segment) + về landing.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-4xl">😵</p>
      <h1 className="text-xl font-bold">Có lỗi xảy ra</h1>
      <p className="max-w-xs text-balance text-sm text-foreground/60">
        Đã có sự cố ngoài ý muốn. Bạn thử lại nhé.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-primary px-5 py-2 font-semibold text-primary-fg active:scale-95"
        >
          Thử lại
        </button>
        <a
          href="/"
          className="rounded-xl border border-border px-5 py-2 font-semibold"
        >
          Về trang đầu
        </a>
      </div>
    </main>
  );
}
