"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isValidUuid } from "../../lib/uuid";
import { readStoredSessionId } from "../../lib/sessionStore";

/**
 * ResumeGate — vào /session KHÔNG có `?id=` (reload/bookmark/mở lại app) → khôi phục phiên
 * từ sessionStorage (T5-1). Có id đã lưu hợp lệ → điều hướng `/session?id=<id>` (SessionView
 * poll resume đúng phase, KHÔNG tạo session mới). Không có → về landing.
 */
export function ResumeGate() {
  const router = useRouter();

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = readStoredSessionId(window.sessionStorage);
    } catch {
      /* sessionStorage không khả dụng */
    }
    if (stored && isValidUuid(stored)) {
      router.replace(`/session?id=${stored}`);
    } else {
      router.replace("/");
    }
  }, [router]);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-6 text-white"
      style={{ background: "linear-gradient(160deg,#0F766E,#0b3b38)" }}
    >
      <p className="text-lg opacity-80">Đang khôi phục phiên…</p>
    </main>
  );
}
