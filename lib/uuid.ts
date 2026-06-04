/**
 * Validate UUID (mọi version, hoa/thường). `guest_token` sinh bởi `crypto.randomUUID()` (v4)
 * và `VENUE_ID` đều phải khớp dạng này. Pure — test được không cần DOM/DB.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}
