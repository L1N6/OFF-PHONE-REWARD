/**
 * Khoảng cách Haversine giữa 2 toạ độ (mét) — specs §4 Module 3 (T3-4). PURE, test offline.
 * Dùng để so với `venue.radius_meters` (presence GPS). KHÔNG lưu toạ độ — tính rồi discard.
 */

const EARTH_RADIUS_M = 6_371_000; // bán kính Trái Đất trung bình (m)
const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  // clamp √a ≤ 1 chống lỗi số học (a có thể > 1 cực nhỏ do floating point).
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}
