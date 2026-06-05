import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getPosition,
  classifyGeoError,
  GEO_OPTIONS,
  ACCURACY_WARN_M,
  type GeoLike,
} from "../lib/geolocation";

// =====================================================================
// OFFLINE — geolocation capture pure/injectable (specs §4 Module 3, T3-2).
// Mock GeoLike: gọi success/error callback đồng bộ.
// =====================================================================

const okGeo = (latitude: number, longitude: number, accuracy: number): GeoLike => ({
  getCurrentPosition: (success) =>
    success({ coords: { latitude, longitude, accuracy } }),
});
const errGeo = (code: number): GeoLike => ({
  getCurrentPosition: (_success, error) => error({ code }),
});

test("classifyGeoError: 1→DENIED · 2→UNAVAILABLE · 3→TIMEOUT · mã lạ→UNAVAILABLE", () => {
  assert.equal(classifyGeoError(1), "PERMISSION_DENIED");
  assert.equal(classifyGeoError(2), "UNAVAILABLE");
  assert.equal(classifyGeoError(3), "TIMEOUT");
  assert.equal(classifyGeoError(99), "UNAVAILABLE");
});

test("GEO_OPTIONS đúng spec: enableHighAccuracy + timeout 10s", () => {
  assert.equal(GEO_OPTIONS.enableHighAccuracy, true);
  assert.equal(GEO_OPTIONS.timeout, 10_000);
  assert.equal(ACCURACY_WARN_M, 100);
});

test("getPosition: success accuracy tốt (≤100m) → ok, lowAccuracy=false", async () => {
  const r = await getPosition(okGeo(10.77, 106.7, 20));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.lat, 10.77);
  assert.equal(r.lng, 106.7);
  assert.equal(r.accuracy, 20);
  assert.equal(r.lowAccuracy, false);
});

test("getPosition: accuracy > 100m → lowAccuracy=true (vẫn ok, không chặn)", async () => {
  const r = await getPosition(okGeo(10, 106, 150));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.lowAccuracy, true);
});

test("getPosition: biên accuracy = 100 → KHÔNG cảnh báo (>100 mới warn)", async () => {
  const r = await getPosition(okGeo(0, 0, 100));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.lowAccuracy, false);
});

test("getPosition: PERMISSION_DENIED (code 1)", async () => {
  const r = await getPosition(errGeo(1));
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.reason, "PERMISSION_DENIED");
});

test("getPosition: TIMEOUT (code 3)", async () => {
  const r = await getPosition(errGeo(3));
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.reason, "TIMEOUT");
});

test("getPosition: POSITION_UNAVAILABLE (code 2)", async () => {
  const r = await getPosition(errGeo(2));
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.reason, "UNAVAILABLE");
});

test("getPosition: thiếu hỗ trợ (geo undefined) → UNSUPPORTED", async () => {
  const r = await getPosition(undefined);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.reason, "UNSUPPORTED");
});
