/**
 * Geolocation capture (specs §4 Module 3, T3-2) — lõi INJECTABLE để test offline.
 *
 * FE lấy toạ độ qua `getCurrentPosition`. Check khoảng cách (Haversine) + cấp voucher là
 * T3-4 (server, RPC `claim_voucher`). KHÔNG lưu toạ độ ngoài luồng claim (specs §4 Module 3).
 * `timeout`/`accuracy` là tham số THIẾT BỊ, không phải business time → không đụng Invariant #1
 * (cửa sổ 45–48' vẫn do SQL re-check trong claim_voucher).
 */

// Tối thiểu hoá kiểu để mock dễ trong test + không phụ thuộc DOM lib khi chạy node:test.
// `navigator.geolocation` (Geolocation) khớp cấu trúc GeoLike → truyền thẳng được.
export interface GeoOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface GeoLike {
  getCurrentPosition(
    success: (pos: {
      coords: { latitude: number; longitude: number; accuracy: number };
    }) => void,
    error: (err: { code: number }) => void,
    options?: GeoOptions,
  ): void;
}

export type GeoReason =
  | "PERMISSION_DENIED"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "UNSUPPORTED";

export type GeoResult =
  | { ok: true; lat: number; lng: number; accuracy: number; lowAccuracy: boolean }
  | { ok: false; reason: GeoReason };

// specs §4 Module 3: enableHighAccuracy + timeout 10s.
export const GEO_OPTIONS: GeoOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

// accuracy > 100m → cảnh báo nhưng VẪN tiếp tục (checklist T3-2).
export const ACCURACY_WARN_M = 100;

/**
 * Map mã lỗi `GeolocationPositionError` → reason.
 * 1 = PERMISSION_DENIED · 2 = POSITION_UNAVAILABLE · 3 = TIMEOUT.
 */
export function classifyGeoError(
  code: number,
): Exclude<GeoReason, "UNSUPPORTED"> {
  if (code === 1) return "PERMISSION_DENIED";
  if (code === 3) return "TIMEOUT";
  return "UNAVAILABLE"; // 2 (POSITION_UNAVAILABLE) hoặc mã lạ
}

/**
 * Lấy vị trí hiện tại → `Promise<GeoResult>`. KHÔNG bao giờ reject (luôn resolve để UI map
 * gọn bằng một nhánh). `geo` injectable (mock trong test); không hỗ trợ → `UNSUPPORTED`.
 */
export function getPosition(
  geo: GeoLike | undefined,
  options: GeoOptions = GEO_OPTIONS,
): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!geo || typeof geo.getCurrentPosition !== "function") {
      resolve({ ok: false, reason: "UNSUPPORTED" });
      return;
    }
    geo.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        resolve({
          ok: true,
          lat: latitude,
          lng: longitude,
          accuracy,
          lowAccuracy: accuracy > ACCURACY_WARN_M,
        });
      },
      (err) => resolve({ ok: false, reason: classifyGeoError(err.code) }),
      options,
    );
  });
}
