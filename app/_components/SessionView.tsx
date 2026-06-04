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
import { MOCK_QUESTS, type ActiveQuest } from "../../lib/quests";
import { playBeep } from "../../lib/audio";
import { validateSubQuest } from "../../actions/validateSubQuest";
import { getActiveQuests } from "../../actions/getActiveQuests";
import { Sudoku } from "./Sudoku";
import { BlindBox, type ValidateFn } from "./BlindBox";
import { Meditation } from "./Meditation";

const POLL_MS = 30_000; // specs §4 Module 2: poll mỗi 30s, tick local giữa 2 poll

/**
 * SessionView — khung phiên focus (specs §4 Module 2 + §3 Blind Box).
 *
 * - Poll `/api/session-status?id=` mỗi 30s; PHASE do server quyết (Invariant #1).
 * - Countdown tick local 1s (chỉ HIỂN THỊ). Resync mỗi poll.
 * - Phase 2: vibrate + beep (1 lần) + Blind Box (validateSubQuest). Visual pulse là
 *   fallback luôn-chạy (Invariant #4); beep chỉ kêu nếu audio unlock ở START (Inv #5).
 * - `mockDelta` (chỉ dev): dựng status + dùng MOCK_QUESTS + mock-validate (đáp án "1234")
 *   → verify offline mọi phase, kể cả luồng Blind Box (MOCK-FIRST, Invariant #7).
 */
export function SessionView({
  sessionId,
  mockDelta,
}: {
  sessionId: string;
  mockDelta?: number;
}) {
  const router = useRouter();
  const isMock = mockDelta !== undefined;

  // Mock: tính thẳng trong render → SSR hiển thị được. sub_quest_passed=false để test Blind Box.
  const mockStatus =
    mockDelta !== undefined
      ? deriveSessionStatus(
          mockDelta,
          mockDelta > 2880 ? "EXPIRED" : "RUNNING",
          false,
        )
      : null;

  const [status, setStatus] = useState<SessionStatus | null>(mockStatus);
  const [fetchTime, setFetchTime] = useState<number>(0);
  const [now, setNow] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quests, setQuests] = useState<ActiveQuest[] | null>(
    isMock ? MOCK_QUESTS : null,
  );
  const [localPassed, setLocalPassed] = useState(false);
  const [beeped, setBeeped] = useState(false);
  const [infractions, setInfractions] = useState(0);

  // Poll server (bỏ qua khi mock).
  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    if (isMock) {
      setFetchTime(Date.now());
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/session-status?id=${sessionId}`, {
          cache: "no-store",
        });
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
        if (!cancelled) setError("CONN");
      }
    };
    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [sessionId, isMock, router]);

  // Tick 1s cho countdown.
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const phase = status?.phase;

  // Vào Phase 2: vibrate + beep MỘT lần.
  useEffect(() => {
    if (phase !== 2 || beeped) return;
    setBeeped(true);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([200, 100, 200]); // iOS Safari fail im lặng → visual pulse fallback
    }
    playBeep(); // chỉ kêu nếu audio đã unlock ở nút START (Invariant #5)
  }, [phase, beeped]);

  // Lấy quest hôm nay khi vào Phase 2 (real). Mock đã có sẵn MOCK_QUESTS.
  useEffect(() => {
    if (isMock || phase !== 2 || quests !== null) return;
    let cancelled = false;
    getActiveQuests()
      .then((qs) => {
        if (!cancelled) setQuests(qs);
      })
      .catch(() => {
        if (!cancelled) setQuests([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isMock, phase, quests]);

  // visibilitychange: rời màn hình (hidden) → log infraction (POST → INCREMENT DB, Inv #2).
  // MVP: chỉ đếm để cảnh báo (banner ≥3), KHÔNG auto-fail. Mock không log.
  useEffect(() => {
    if (isMock) return;
    const onVis = () => {
      if (document.visibilityState !== "hidden") return;
      fetch("/api/log-infraction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId }),
        keepalive: true, // gửi được cả khi tab đang bị ẩn
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && typeof d.infraction_count === "number" && d.infraction_count >= 0) {
            setInfractions(d.infraction_count);
          }
        })
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isMock, sessionId]);

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
  const clock = mounted ? formatMMSS(CLAIM_OPEN - liveDelta) : "--:--";
  const passed = Boolean(status.sub_quest_passed) || localPassed;

  // Validate handler (real / mock) — set localPassed khi valid → Blind Box khoá ngay.
  const handleValidate: ValidateFn = async (input) => {
    let r: { ok: true; valid: boolean } | { ok: false; error: string };
    if (isMock) {
      const ok = input.answer
        ? input.answer.trim() === "1234"
        : Boolean(input.confirmed);
      r = { ok: true, valid: ok };
    } else {
      r = await validateSubQuest(sessionId, input);
    }
    if (r.ok && r.valid) setLocalPassed(true);
    return r;
  };

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
      {infractions >= 3 && (
        <div className="fixed inset-x-0 top-0 z-10 bg-rose-600/95 px-4 py-2 text-center text-sm font-medium text-white">
          ⚠️ Bạn đã rời màn hình {infractions} lần — giữ máy xuống để hoàn thành nhé!
        </div>
      )}
      <PhaseHeader phase={status.phase} clock={clock} />
      <div className="mt-6 w-full">
        {status.phase === 1 && <Sudoku grid={SAMPLE_SUDOKU} />}
        {status.phase === 2 && (
          <BlindBox
            quests={quests ?? []}
            passed={passed}
            onValidate={handleValidate}
          />
        )}
        {status.phase === 3 && <Meditation />}
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
