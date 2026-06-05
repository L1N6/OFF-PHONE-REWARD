"use server";

import { safeEqual } from "../lib/bypass";

export type VerifyBypassResult =
  | { ok: true; valid: boolean }
  | { ok: false; error: "SERVER_ERROR" };

/**
 * verifyBypass(code) — fallback khi GPS lỗi (specs §4 Module 3, T3-3 🟢 MVP mã tĩnh).
 *
 * So sánh CONSTANT-TIME `code` với env `CASHIER_BYPASS_CODE` (server-only, KHÔNG lộ ra client).
 * - `{ ok:true, valid:true }`  → mã đúng → FE tiếp tục claim (T3-4 `claimVoucher`).
 * - `{ ok:true, valid:false }` → mã sai → FE báo lỗi thân thiện, KHÔNG reveal lý do.
 * - `{ ok:false, error }`      → lỗi cấu hình (chưa set env).
 *
 * Lưu ý bảo mật T3-4: presence (GPS Haversine HOẶC bypass) phải được RE-CHECK ở Server Action
 * claimVoucher trước khi gọi RPC — KHÔNG tin cờ "đã verify" từ client (verifyBypass chỉ là
 * phản hồi tức thì cho UX; claimVoucher sẽ tự verify lại mã bằng `safeEqual`).
 */
export async function verifyBypass(code: string): Promise<VerifyBypassResult> {
  const expected = process.env.CASHIER_BYPASS_CODE;
  if (!expected) {
    console.error("verifyBypass: CASHIER_BYPASS_CODE env chưa set");
    return { ok: false, error: "SERVER_ERROR" };
  }
  const input = (code ?? "").trim();
  if (input.length === 0) return { ok: true, valid: false };
  return { ok: true, valid: safeEqual(input, expected) };
}
