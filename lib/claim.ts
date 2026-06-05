/**
 * Kiểu chia sẻ cho luồng claim (specs §4 Module 3, T3-4) — PURE, an toàn cả client & server.
 * `actions/claimVoucher.ts` (server) và `app/_components/ClaimPanel.tsx` (client) cùng import.
 */

// Bằng chứng có mặt tại quán: GPS (Haversine) HOẶC mã nhân viên (bypass).
export type ClaimPresence = { lat: number; lng: number } | { bypassCode: string };

export type ClaimError =
  | "INVALID_SESSION"
  | "PRESENCE_FAILED" // GPS ngoài bán kính / mã bypass sai
  | "QUEST_NOT_PASSED"
  | "OUTSIDE_WINDOW"
  | "SESSION_NOT_RUNNING"
  | "POOL_EMPTY"
  | "SERVER_ERROR";

export type ClaimVoucherResult =
  | { ok: true; code: string }
  | { ok: false; error: ClaimError };
