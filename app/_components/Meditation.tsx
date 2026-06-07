"use client";

import { useEffect, useState } from "react";
import {
  isAudioUnlocked,
  unlockAudio,
  startAmbient,
  stopAmbient,
} from "../../lib/audio";

const PHRASES = [
  "Hít thở thật sâu…",
  "Buông lỏng đôi vai…",
  "Cảm nhận hơi thở vào — ra…",
  "Bạn đang làm rất tốt.",
  "Sắp tới giờ nhận thưởng rồi…",
];

/**
 * Meditation — UI Phase 3 (specs §4 Module 2). Hourglass SVG lật chậm (CSS, KHÔNG GIF) +
 * câu thiền fade-cycle. Lo-fi audio (pad sine procedural, lib/audio): autoplay NẾU audio đã
 * unlock bởi gesture nút START (Invariant #5 — module `unlocked` còn sống qua client-nav);
 * chưa unlock (reload/mở thẳng) → nút "Bật nhạc" (click = gesture mới → unlock + phát).
 */
export function Meditation() {
  const [idx, setIdx] = useState(0);
  const [audioOn, setAudioOn] = useState(false);
  const [needGesture, setNeedGesture] = useState(false);

  // Đổi câu thiền mỗi 6s (fade qua CSS, remount bằng key).
  useEffect(() => {
    const iv = setInterval(() => setIdx((p) => (p + 1) % PHRASES.length), 6000);
    return () => clearInterval(iv);
  }, []);

  // Audio: đã unlock (client-nav từ START) → autoplay; chưa → hiện nút.
  useEffect(() => {
    if (isAudioUnlocked() && startAmbient()) {
      setAudioOn(true);
    } else {
      setNeedGesture(true);
    }
    return () => stopAmbient();
  }, []);

  const enableAudio = () => {
    unlockAudio(); // click = gesture → unlock (Invariant #5)
    if (startAmbient()) {
      setAudioOn(true);
      setNeedGesture(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <Hourglass />
      <p
        key={idx}
        className="animate-med-fade min-h-[1.75rem] text-lg font-medium text-accent"
      >
        {PHRASES[idx]}
      </p>
      {audioOn ? (
        <p className="text-xs opacity-60">🎵 Nhạc nền đang phát…</p>
      ) : needGesture ? (
        <button
          onClick={enableAudio}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-fg"
        >
          🎵 Bật nhạc thiền
        </button>
      ) : null}
    </div>
  );
}

/** Hourglass SVG — lật chậm vô hạn bằng CSS (`animate-hourglass`). */
function Hourglass() {
  return (
    <svg
      viewBox="0 0 64 96"
      className="animate-hourglass h-28 w-20 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="6" x2="52" y2="6" strokeLinecap="round" />
      <line x1="12" y1="90" x2="52" y2="90" strokeLinecap="round" />
      <path d="M16 6 C16 30 32 40 32 48 C32 56 16 66 16 90" />
      <path d="M48 6 C48 30 32 40 32 48 C32 56 48 66 48 90" />
      <path d="M22 14 L42 14 L32 38 Z" fill="currentColor" stroke="none" opacity="0.85" />
      <path d="M26 90 L38 90 L32 70 Z" fill="currentColor" stroke="none" opacity="0.85" />
    </svg>
  );
}
