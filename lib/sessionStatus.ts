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
