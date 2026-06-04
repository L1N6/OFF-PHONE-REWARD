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

/**
 * Beep ngắn báo chuyển pha (T2-3 Phase 2). CHỈ phát nếu AudioContext đã unlock bởi gesture
 * START (Invariant #5 AUDIO GATE) — chưa unlock → im lặng (visual border pulse là fallback
 * luôn-chạy, Invariant #4). Nuốt mọi lỗi: audio không bắt buộc.
 */
export function playBeep(durationMs = 180, freq = 660): void {
  if (!ctx || !unlocked) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // bỏ qua
  }
}

// Ambient pad (T2-4 Meditation) — nhạc nền lo-fi tạo bằng Web Audio (không cần file asset).
let ambientGain: GainNode | null = null;
let ambientOscs: OscillatorNode[] = [];

/**
 * Bật pad nền êm (hợp âm sine trầm, volume rất nhỏ) cho Phase 3 Thiền. CHỈ chạy nếu audio
 * đã unlock bởi user gesture (Invariant #5 AUDIO GATE). Trả `true` nếu đã/đang phát. Idempotent.
 * (MVP: pad procedural; đổi sang asset lo-fi thật trước pilot nếu muốn.)
 */
export function startAmbient(): boolean {
  if (!ctx || !unlocked) return false;
  if (ambientGain) return true; // đang phát rồi
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const master = ctx.createGain();
    master.gain.value = 0.05; // rất nhẹ
    master.connect(ctx.destination);
    // Hợp âm trầm êm (A2 + E3 + A3) — quãng 5, dễ chịu để thiền.
    ambientOscs = [110, 164.81, 220].map((f) => {
      const osc = ctx!.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(master);
      osc.start();
      return osc;
    });
    ambientGain = master;
    return true;
  } catch {
    return false;
  }
}

/** Tắt pad nền (rời Phase 3 / unmount). */
export function stopAmbient(): void {
  try {
    for (const osc of ambientOscs) osc.stop();
    ambientGain?.disconnect();
  } catch {
    // bỏ qua
  }
  ambientOscs = [];
  ambientGain = null;
}
