"use client";

import { useEffect, useState } from "react";

/** Key localStorage cho guest token ẩn danh (Invariant #3 NO AUTH). */
export const GUEST_TOKEN_KEY = "guest_token";

/**
 * Pure get-or-create: đọc token từ storage; nếu chưa có thì sinh bằng genId() rồi lưu.
 * Tách khỏi React để test được mà KHÔNG cần DOM (theo triết lý node:test của dự án — xem T0-2 ADR).
 * @param storage  localStorage thật (browser) hoặc mock (test)
 * @param genId    nguồn UUID — `crypto.randomUUID` ở browser, fixed ở test
 */
export function getOrCreateGuestToken(
  storage: Pick<Storage, "getItem" | "setItem">,
  genId: () => string,
): string {
  const existing = storage.getItem(GUEST_TOKEN_KEY);
  if (existing) return existing;
  const token = genId();
  storage.setItem(GUEST_TOKEN_KEY, token);
  return token;
}

export interface GuestTokenState {
  /** UUID guest; null cho tới khi hydrate xong ở client. */
  token: string | null;
  /** false khi SSR + render client lần đầu; true sau khi useEffect chạy (đã có token). */
  isReady: boolean;
}

/**
 * useGuestToken — cấp & nhớ guest token ẩn danh, persist qua localStorage (bền qua refresh).
 *
 * SSR-safe & KHÔNG hydration mismatch: state khởi tạo {null,false} nên server và lần render
 * client đầu tiên giống hệt nhau. `useEffect` (chỉ chạy ở client, sau mount) mới chạm
 * localStorage/crypto → cập nhật {token, isReady:true}.
 */
export function useGuestToken(): GuestTokenState {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // useEffect vốn chỉ chạy ở client; guard này tường minh hoá hợp đồng SSR-safe.
    if (typeof window === "undefined") return;
    setToken(getOrCreateGuestToken(window.localStorage, () => crypto.randomUUID()));
    setIsReady(true);
  }, []);

  return { token, isReady };
}
