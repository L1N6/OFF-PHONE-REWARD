import { test } from "node:test";
import assert from "node:assert/strict";
import { haversineMeters } from "../lib/haversine";

// =====================================================================
// OFFLINE — Haversine pure (specs §4 Module 3, T3-4). Điểm biết trước + tolerance.
// =====================================================================

test("haversineMeters: cùng điểm → 0", () => {
  assert.equal(haversineMeters(10.7769, 106.7009, 10.7769, 106.7009), 0);
});

test("haversineMeters: 1° vĩ độ ≈ 111.19 km", () => {
  const d = haversineMeters(0, 0, 1, 0);
  assert.ok(Math.abs(d - 111194.9) < 5, "got " + d);
});

test("haversineMeters: 1° kinh độ tại xích đạo ≈ 111.19 km", () => {
  const d = haversineMeters(0, 0, 0, 1);
  assert.ok(Math.abs(d - 111194.9) < 5, "got " + d);
});

test("haversineMeters: đối xứng (A→B = B→A)", () => {
  const a = haversineMeters(10.776, 106.7, 10.78, 106.705);
  const b = haversineMeters(10.78, 106.705, 10.776, 106.7);
  assert.ok(Math.abs(a - b) < 1e-6, `a=${a} b=${b}`);
});

test("haversineMeters: ~11m cho 0.0001° vĩ độ (trong bán kính quán)", () => {
  const d = haversineMeters(10.7769, 106.7009, 10.777, 106.7009);
  assert.ok(d > 5 && d < 20, "got " + d); // ≈ 11.1m
});
