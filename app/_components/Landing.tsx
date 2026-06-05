"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGuestToken } from "../../hooks/useGuestToken";
import { createSession } from "../../actions/createSession";
import { unlockAudio } from "../../lib/audio";
import { writeStoredSessionId } from "../../lib/sessionStore";
import { MESSAGES } from "../../lib/messages";
import type { Branding } from "../../lib/branding";

function errorMessage(
  error: "INVALID_TOKEN" | "RATE_LIMITED" | "SERVER_ERROR",
): string {
  if (error === "RATE_LIMITED") return MESSAGES.rateLimited;
  if (error === "INVALID_TOKEN")
    return "Phiên không hợp lệ. Hãy tải lại trang rồi thử lại.";
  return "Có lỗi xảy ra. Vui lòng thử lại.";
}

export function Landing({ branding }: { branding: Branding }) {
  const router = useRouter();
  const { token, isReady } = useGuestToken();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (!isReady || !token || loading) return;
    setError(null);
    setLoading(true);
    unlockAudio(); // Invariant #5: unlock audio NGAY trong user gesture
    try {
      // Cờ "đã có gesture" để phase Thiền (T2-4) quyết định autoplay lo-fi.
      sessionStorage.setItem("audio_gesture", "1");
      const result = await createSession(token);
      if (result.ok) {
        writeStoredSessionId(sessionStorage, result.sessionId);
        router.push(`/session?id=${result.sessionId}`);
        return; // giữ trạng thái loading trong lúc điều hướng
      }
      setError(errorMessage(result.error));
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <span
          className="rounded-full px-4 py-1 text-xs font-semibold tracking-wide text-white"
          style={{ backgroundColor: branding.accentColor }}
        >
          {branding.challengeName}
        </span>
        <h1 className="max-w-md text-balance text-3xl font-bold leading-tight sm:text-4xl">
          Gác lại mạng xã hội{" "}
          <span style={{ color: branding.primaryColor }}>45 phút</span>
        </h1>
        <p className="max-w-sm text-balance text-base text-foreground/70">
          Tập trung 45 phút không lướt mạng xã hội — nhận ngay voucher{" "}
          <span
            className="font-semibold"
            style={{ color: branding.accentColor }}
          >
            giảm 10%
          </span>{" "}
          cho ly tiếp theo.
        </p>
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={!isReady || loading}
        className="w-full max-w-xs rounded-2xl px-8 py-5 text-lg font-bold text-white shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: branding.primaryColor }}
      >
        {loading ? "Đang tạo phiên…" : "BẮT ĐẦU"}
      </button>

      {error && (
        <p
          role="alert"
          className="max-w-xs text-balance text-sm font-medium text-red-600"
        >
          {error}
        </p>
      )}

      <p className="max-w-xs text-balance text-xs text-foreground/40">
        Không cần đăng nhập. Đặt điện thoại xuống và bắt đầu thử thách.
      </p>
    </main>
  );
}
