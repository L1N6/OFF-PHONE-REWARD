/**
 * Session phase machine (specs §4 Module 2) — PURE, test offline được (không Date.now()).
 *
 * Nguồn thời gian DUY NHẤT = `delta_seconds` do Postgres tính (RPC `get_session_status`,
 * Invariant #1 SERVER TIME). Các hàm ở đây chỉ map delta → phase + cờ claim-window bằng
 * số học thuần (KHÔNG chạm đồng hồ client) → vừa an toàn Invariant #1, vừa unit-test được
 * mọi biên mà không cần DB. Quyền claim THẬT vẫn nằm ở RPC `claim_voucher` (re-check SQL);
 * `claim_window_open` ở đây chỉ là gợi ý UI.
 */

export type SessionDbStatus = "RUNNING" | "COMPLETED" | "FAILED" | "EXPIRED";

// Phase 1/2/3 = 3 pha focus; CLAIMABLE = Giờ Vàng 45–48'; EXPIRED = quá 48'.
export type SessionPhase = 1 | 2 | 3 | "CLAIMABLE" | "EXPIRED";

export interface SessionStatus {
  delta_seconds: number;
  phase: SessionPhase;
  status: SessionDbStatus;
  sub_quest_passed: boolean;
  claim_window_open: boolean;
  claim_window_expired: boolean;
}

// Mốc (giây kể từ start_time) — specs §4 Module 2:
//   <900 → 1 (Sudoku) · 900–2100 → 2 (Blind Box) · 2100–2700 → 3 (Meditation)
//   2700–2880 → CLAIMABLE (Giờ Vàng) · >2880 → EXPIRED
export const PHASE2_START = 900; // 15'
export const PHASE3_START = 2100; // 35'
export const CLAIM_OPEN = 2700; // 45'
export const CLAIM_CLOSE = 2880; // 48'

/**
 * Map Δt (giây) → phase.
 * Biên: [0,900)=1 · [900,2100)=2 · [2100,2700)=3 · [2700,2880]=CLAIMABLE · >2880=EXPIRED.
 */
export function derivePhase(deltaSeconds: number): SessionPhase {
  if (deltaSeconds < PHASE2_START) return 1;
  if (deltaSeconds < PHASE3_START) return 2;
  if (deltaSeconds < CLAIM_OPEN) return 3;
  if (deltaSeconds <= CLAIM_CLOSE) return "CLAIMABLE";
  return "EXPIRED";
}

/**
 * Gộp raw facts (từ RPC) → object trả về FE.
 * - `claim_window_open`: trong Giờ Vàng [2700,2880] VÀ phiên còn RUNNING
 *   (đã COMPLETED/EXPIRED/FAILED → false, tránh hiện lại nút CLAIM).
 * - `claim_window_expired`: đã quá 48' (cửa sổ đóng vĩnh viễn).
 */
export function deriveSessionStatus(
  deltaSeconds: number,
  status: SessionDbStatus,
  subQuestPassed: boolean,
): SessionStatus {
  return {
    delta_seconds: deltaSeconds,
    phase: derivePhase(deltaSeconds),
    status,
    sub_quest_passed: subQuestPassed,
    claim_window_open:
      status === "RUNNING" &&
      deltaSeconds >= CLAIM_OPEN &&
      deltaSeconds <= CLAIM_CLOSE,
    claim_window_expired: deltaSeconds > CLAIM_CLOSE,
  };
}

// Trạng thái HIỂN THỊ khu vực nhận thưởng (Giờ Vàng). Xem `deriveClaimView`.
export type ClaimView = "CLAIM" | "NEED_QUEST" | "EXPIRED" | "NONE";

/**
 * T3-1 — trạng thái HIỂN THỊ của khu vực nhận thưởng (specs §4 Module 2/3). PURE, test offline.
 * KHÔNG thực hiện claim (GPS / bypass / RPC `claim_voucher` là T3-2..T3-4); chỉ quyết định render gì:
 *   • "CLAIM"      — trong Giờ Vàng (`claim_window_open`) VÀ đã pass Blind Box → nút CLAIM (CTA).
 *   • "NEED_QUEST" — trong Giờ Vàng nhưng CHƯA pass quest → nhắc hoàn thành Blind Box.
 *   • "EXPIRED"    — đã quá 48' (`claim_window_expired`) → message + về landing.
 *   • "NONE"       — chưa tới Giờ Vàng (phase 1/2/3) hoặc phiên đã đóng (COMPLETED/FAILED).
 * `passed` = effective: `status.sub_quest_passed || localPassed` (optimistic UX, poll xác nhận sau).
 * `claim_window_open` đã tự gate `status==='RUNNING'` → COMPLETED/FAILED trong window → "NONE".
 */
export function deriveClaimView(status: SessionStatus, passed: boolean): ClaimView {
  if (status.claim_window_expired) return "EXPIRED";
  if (status.claim_window_open) return passed ? "CLAIM" : "NEED_QUEST";
  return "NONE";
}

/**
 * Δt "sống" để client tick countdown MƯỢT giữa 2 lần poll (specs §4 Module 2).
 * = serverDelta + thời gian trôi kể từ lúc nhận response. CHỈ để HIỂN THỊ (Invariant #1:
 * client dùng thời gian để display; quyết định phase vẫn theo server poll). Pure: nhận
 * `nowMs` làm tham số (không gọi Date.now() bên trong) → test được.
 */
export function computeLiveDelta(
  serverDelta: number,
  fetchTimeMs: number,
  nowMs: number,
): number {
  return serverDelta + (nowMs - fetchTimeMs) / 1000;
}

/** Format giây → "MM:SS" (zero-pad). Clamp số âm về "00:00". */
export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/**
 * Clock sync (specs §4 Module 2) — đồng bộ "mốc bắt đầu phiên" (client-clock ms) qua mỗi poll
 * để countdown KHÔNG giật. `candidate = fetchTimeMs - serverDelta*1000` (ước lượng lúc phiên
 * bắt đầu, theo đồng hồ client tại lần poll này).
 *   • Lần đầu (`prev=null`) → lấy thẳng candidate.
 *   • Lệch lớn (|drift| ≥ `snapMs`) → SNAP (ước lượng cũ sai nhiều → nhảy tới đúng).
 *   • Lệch nhỏ (< `snapMs`) → EASE (kéo prev về candidate theo `ease`, mượt qua vài poll).
 * Pure → test offline. Display-only (Invariant #1: nguồn thời gian vẫn là serverDelta).
 */
export function reconcileStartEpoch(
  prevStartEpoch: number | null,
  serverDelta: number,
  fetchTimeMs: number,
  snapMs = 5000,
  ease = 0.34,
): number {
  const candidate = fetchTimeMs - serverDelta * 1000;
  if (prevStartEpoch === null) return candidate;
  const drift = candidate - prevStartEpoch;
  if (Math.abs(drift) >= snapMs) return candidate;
  return prevStartEpoch + drift * ease;
}

/** Giây trôi kể từ mốc bắt đầu (client-clock). Pure. */
export function elapsedSince(startEpochMs: number, nowMs: number): number {
  return (nowMs - startEpochMs) / 1000;
}
