import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseBranding,
  brandingCssVars,
  brandingMascot,
  DEFAULT_BRANDING,
} from "../lib/branding";
import { THEMES } from "../lib/theme";

test("parseBranding: theme_id + challenge_name hợp lệ", () => {
  const r = parseBranding({ theme_id: "cat_cafe", challenge_name: "Test Challenge" });
  assert.deepEqual(r, { themeId: "cat_cafe", challengeName: "Test Challenge" });
});

test("parseBranding: theme_id lạ → fallback cozy_cafe", () => {
  const r = parseBranding({ theme_id: "khong_co", challenge_name: "X" });
  assert.equal(r.themeId, "cozy_cafe");
  assert.equal(r.challengeName, "X");
});

test("parseBranding: thiếu field → default (themeId cozy_cafe, tên mặc định)", () => {
  const r = parseBranding({ theme_id: "lofi_night" });
  assert.equal(r.themeId, "lofi_night");
  assert.equal(r.challengeName, DEFAULT_BRANDING.challengeName);
});

test("parseBranding: raw null/sai kiểu → full DEFAULT_BRANDING", () => {
  assert.deepEqual(parseBranding(null), DEFAULT_BRANDING);
  assert.deepEqual(parseBranding("nonsense"), DEFAULT_BRANDING);
  assert.deepEqual(parseBranding(123), DEFAULT_BRANDING);
});

test("parseBranding: field sai kiểu (number) → bỏ qua, dùng default", () => {
  const r = parseBranding({ theme_id: 5, challenge_name: 9 });
  assert.deepEqual(r, DEFAULT_BRANDING);
});

test("brandingCssVars: lấy biến theme theo themeId", () => {
  const r = brandingCssVars({ themeId: "cat_cafe", challengeName: "X" });
  assert.equal(r["--color-primary"], THEMES.cat_cafe.primary);
});

test("brandingMascot: trả mascot của theme", () => {
  assert.equal(brandingMascot(DEFAULT_BRANDING), "☕");
  assert.equal(brandingMascot({ themeId: "cat_cafe", challengeName: "X" }), "🐱");
});
