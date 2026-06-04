import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBranding, DEFAULT_BRANDING } from "../lib/branding";

test("parseBranding map đầy đủ field từ JSONB venue", () => {
  const r = parseBranding({
    primary_color: "#123456",
    accent_color: "#abcdef",
    challenge_name: "Test Challenge",
  });
  assert.deepEqual(r, {
    primaryColor: "#123456",
    accentColor: "#abcdef",
    challengeName: "Test Challenge",
  });
});

test("parseBranding dùng default cho field thiếu", () => {
  const r = parseBranding({ primary_color: "#000000" });
  assert.equal(r.primaryColor, "#000000");
  assert.equal(r.accentColor, DEFAULT_BRANDING.accentColor);
  assert.equal(r.challengeName, DEFAULT_BRANDING.challengeName);
});

test("parseBranding trả full default khi raw null/sai kiểu", () => {
  assert.deepEqual(parseBranding(null), DEFAULT_BRANDING);
  assert.deepEqual(parseBranding("nonsense"), DEFAULT_BRANDING);
  assert.deepEqual(parseBranding(123), DEFAULT_BRANDING);
});

test("parseBranding bỏ qua field sai kiểu (number thay string)", () => {
  const r = parseBranding({ primary_color: 123, challenge_name: "X" });
  assert.equal(r.primaryColor, DEFAULT_BRANDING.primaryColor);
  assert.equal(r.challengeName, "X");
});
