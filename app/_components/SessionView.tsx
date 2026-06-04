"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  deriveSessionStatus,
  computeLiveDelta,
  formatMMSS,
  CLAIM_OPEN,
  type SessionStatus,
  type SessionPhase,
} from "../../lib/sessionStatus";
import { SAMPLE_SUDOKU } from "../../lib/sudoku";
import { Sudoku } from "./Sudoku";

const POLL_MS = 30_000; // specs §4 Module 2: poll mỗi 30s, tick local giữa 2 poll

/**
 * SessionView — khung phiên focus (specs §4 Module 2).
 *
 * - Poll `/api/session-status?id=` mỗi 30s; PHASE do server quyết (Invariant #1 —
 *   KHÔNG tự tính phase bằng Date.now()).
 * - Countdown tick local 1s giữa 2 poll: `serverDelta + (Date.now()-fetchTime)/1000`
 *   (chỉ để HIỂN THỊ). Resync mỗi poll.
 * - `mockDelta` (chỉ dev, từ `?mock=`): bỏ qua fetch, dựng status tổng hợp trong render
 *   để verify mọi phase offline (MOCK-FIRST, Invariant #7).
 */
export function SessionView({
  sessionId,
  mockDelta,
}: {
  sessionId: string;
  mockDelta?: number;
}) {
  const router = useRouter();

  // Mock: tính thẳng trong render → SSR hiển thị được (verify offline mọi phase).
  const mockStatus =
    mockDelta !== undefined
      ? deriveSessionStatus(
          mockDelta,
          mockDelta > 2880 ? "EXPIRED" : "RUNNING",
          true,
        )
      : null;

  const [status, setStatus] = useState<SessionStatus | null>(mockStatus);
  const [fetchTime, setFetchTime] = useState<number>(0);
  const [now, setNow] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll server (bỏ qua khi mock).
  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    if (mockDelta !== undefined) {
      setFetchTime(Date.now());
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/session-status?id=${sessionId}`, {
          cache: "no-store",
        });
        // id sai / không có phiên → về landing (checklist T2-2).
        if (res.status === 400 || res.status === 404) {
          if (!cancelled) router.replace("/");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError("CONN");
          return;
        }
        const data = (await res.json()) as SessionStatus;
        if (!cancelled) {
          setStatus(data);
          setFetchTime(Date.now());
          setError(null);
        }
      } catch {
        if (!cancelled) setError("CONN"); // lỗi mạng transient → giữ poll, không redirect
      }
    };
    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [sessionId, mockDelta, router]);

  // Tick 1s cho countdown mượt (chỉ display).
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  if (!status) {
    return (
      <Shell>
        <p className="text-lg opacity-80">
          {error ? "Đang kết nối lại…" : "Đang tải phiên…"}
        </p>
      </Shell>
    );
  }

  const liveDelta = computeLiveDelta(
    status.delta_seconds,
    fetchTime || now,
    now || fetchTime,
  );
  // Đếm ngược tới Giờ Vàng (mốc 45' = 2700s). Gate `mounted` tránh hydration mismatch.
  const clock = mounted ? formatMMSS(CLAIM_OPEN - liveDelta) : "--:--";

  // status cuối ưu tiên hơn phase (đã nhận thưởng / hết hạn).
  if (status.status === "COMPLETED") {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">✅ Đã hoàn thành</h1>
        <p className="mt-2 opacity-80">Bạn đã nhận thưởng cho phiên này.</p>
        <LandingLink />
      </Shell>
    );
  }
  if (status.status === "EXPIRED" || status.phase === "EXPIRED") {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">⌛ Phiên đã hết hạn</h1>
        <p className="mt-2 opacity-80">Đã quá cửa sổ nhận thưởng (48 phút).</p>
        <LandingLink />
      </Shell>
    );
  }

  return (
    <Shell>
      <PhaseHeader phase={status.phase} clock={clock} />
      <div className="mt-6 w-full">
        {status.phase === 1 && <Sudoku grid={SAMPLE_SUDOKU} />}
        {status.phase === 2 && (
          <Placeholder label="Pha 2 · Nhiệm vụ Blind Box — sắp có (T2-3)" />
        )}
        {status.phase === 3 && (
          <Placeholder label="Pha 3 · Thiền — sắp có (T2-4)" />
        )}
        {status.phase === "CLAIMABLE" && (
          <Placeholder label="🎁 Giờ Vàng — Nhận thưởng (T3-1)" />
        )}
      </div>
    </Shell>
  );
}

// ---- presentational (local) ----

function Shell({ children }: { children: ReactNode }) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-white"
      style={{ background: "linear-gradient(160deg,#0F766E,#0b3b38)" }}
    >
      {children}
    </main>
  );
}

function PhaseHeader({ phase, clock }: { phase: SessionPhase; clock: string }) {
  const label =
    phase === 1
      ? "Pha 1 · Sudoku"
      : phase === 2
        ? "Pha 2 · Blind Box"
        : phase === 3
          ? "Pha 3 · Thiền"
          : "🎁 Giờ Vàng";
  return (
    <div className="text-center">
      <p className="text-sm uppercase tracking-widest text-amber-300">{label}</p>
      {phase !== "CLAIMABLE" && (
        <p className="mt-1 text-5xl font-bold tabular-nums">{clock}</p>
      )}
      <p className="mt-1 text-xs opacity-70">
        {phase === "CLAIMABLE" ? "Đã đến giờ nhận thưởng" : "đến khi mở quà"}
      </p>
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="mx-auto flex h-40 max-w-xs items-center justify-center rounded-md border border-dashed border-white/40 px-4 text-center text-sm opacity-80">
      {label}
    </div>
  );
}

function LandingLink() {
  return (
    <a
      href="/"
      className="mt-4 rounded-md bg-amber-400 px-5 py-2 font-semibold text-slate-900"
    >
      Về trang đầu
    </a>
  );
}
