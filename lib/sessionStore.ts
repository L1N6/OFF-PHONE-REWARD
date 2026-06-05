/**
 * Lưu/đọc session_id ở sessionStorage (specs §4 Module 1/2, T5-1 resume) — PURE/injectable.
 * Resume khi mở /session không có `?id=`: đọc id đã lưu (lúc START hoặc khi vào /session) →
 * tiếp tục phiên cũ thay vì tạo mới. Key khớp Landing ("session_id").
 */

export const SESSION_ID_KEY = "session_id";

export function readStoredSessionId(
  storage: Pick<Storage, "getItem">,
): string | null {
  const v = storage.getItem(SESSION_ID_KEY);
  return v && v.trim().length > 0 ? v : null;
}

export function writeStoredSessionId(
  storage: Pick<Storage, "setItem">,
  id: string,
): void {
  storage.setItem(SESSION_ID_KEY, id);
}
