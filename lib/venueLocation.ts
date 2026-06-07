/**
 * Venue location validation (specs §4 Module 5, TV2-10) — lõi PURE để test offline.
 *
 * Owner/Manager chỉnh toạ độ + bán kính quán qua `/admin/venue/location`. Server Action
 * `updateVenueLocation` parse FormData (string) → gọi hàm này để validate biên TRƯỚC khi UPDATE.
 * Tách pure (không DOM/DB) → unit-test mọi biên (ADR-004). Không đụng Invariant #1 (không
 * có business-time; lat/lng/radius là cấu hình tĩnh, không phải thời gian).
 */

// Biên hợp lệ — khớp specs §4 Module 5.
export const LAT_MIN = -90;
export const LAT_MAX = 90;
export const LNG_MIN = -180;
export const LNG_MAX = 180;
// radius_meters: SMALLINT trong schema; specs gợi ý 10–500m (20–50m cho quán nhỏ).
export const RADIUS_MIN = 10;
export const RADIUS_MAX = 500;

export type LocationError =
  | "LAT_OUT_OF_RANGE"
  | "LNG_OUT_OF_RANGE"
  | "RADIUS_OUT_OF_RANGE"
  | "NOT_A_NUMBER";

export type LocationResult =
  | { ok: true; lat: number; lng: number; radius: number }
  | { ok: false; error: LocationError };

// Parse 1 field số từ form (string|number|null) → number | null nếu rỗng/không hợp lệ.
// Chấp nhận dấu phẩy thập phân ("10,5") vì user VN hay gõ vậy.
export function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validate toạ độ + bán kính. radius được làm tròn (SMALLINT trong DB).
 * KHÔNG tin client — luôn gọi lại ở server trước khi UPDATE.
 */
export function validateLocationInput(input: {
  lat: unknown;
  lng: unknown;
  radius: unknown;
}): LocationResult {
  const lat = parseNumber(input.lat);
  const lng = parseNumber(input.lng);
  const radiusRaw = parseNumber(input.radius);

  if (lat === null || lng === null || radiusRaw === null) {
    return { ok: false, error: "NOT_A_NUMBER" };
  }
  if (lat < LAT_MIN || lat > LAT_MAX) {
    return { ok: false, error: "LAT_OUT_OF_RANGE" };
  }
  if (lng < LNG_MIN || lng > LNG_MAX) {
    return { ok: false, error: "LNG_OUT_OF_RANGE" };
  }

  const radius = Math.round(radiusRaw);
  if (radius < RADIUS_MIN || radius > RADIUS_MAX) {
    return { ok: false, error: "RADIUS_OUT_OF_RANGE" };
  }

  return { ok: true, lat, lng, radius };
}

// Message thân thiện cho UI (không lộ chi tiết kỹ thuật).
export function describeLocationError(error: LocationError): string {
  switch (error) {
    case "LAT_OUT_OF_RANGE":
      return "Vĩ độ phải trong khoảng -90 đến 90.";
    case "LNG_OUT_OF_RANGE":
      return "Kinh độ phải trong khoảng -180 đến 180.";
    case "RADIUS_OUT_OF_RANGE":
      return `Bán kính phải từ ${RADIUS_MIN} đến ${RADIUS_MAX} mét.`;
    case "NOT_A_NUMBER":
      return "Vui lòng nhập đầy đủ vĩ độ, kinh độ và bán kính (dạng số).";
  }
}
