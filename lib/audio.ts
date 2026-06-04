/**
 * Audio unlock singleton — Invariant #5 AUDIO GATE: AudioContext chỉ được tạo/resume SAU
 * user gesture (nút START). Singleton ở module-level nên SỐNG QUA client-side navigation của
 * Next (router.push không reload trang) → phase Thiền (T2-4) dùng lại context đã unlock.
 */
let ctx: AudioContext | null = null;
let unlocked = false;

export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return; // trình duyệt không hỗ trợ → bỏ qua (các phase sau có visual fallback)
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    unlocked = true;
  } catch {
    // Audio không bắt buộc — nuốt lỗi để UI vẫn chạy bình thường.
  }
}

export function getAudioContext(): AudioContext | null {
  return ctx;
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}
