import { test } from "node:test";
import assert from "node:assert/strict";
import {
  THEMES,
  THEME_IDS,
  DEFAULT_THEME_ID,
  resolveTheme,
  isValidThemeId,
  themeCssVars,
} from "../lib/theme";

test("THEMES có đúng 4 preset pilot", () => {
  assert.deepEqual(THEME_IDS.sort(), [
    "book_acoustic",
    "cat_cafe",
    "cozy_cafe",
    "lofi_night",
  ]);
  assert.equal(DEFAULT_THEME_ID, "cozy_cafe");
});

test("mỗi theme có đủ field token (kênh RGB) + mascot", () => {
  for (const id of THEME_IDS) {
    const t = THEMES[id];
    assert.equal(t.id, id);
    assert.ok(t.name.length > 0, `${id} thiếu name`);
    assert.ok(t.mascot.length > 0, `${id} thiếu mascot`);
    for (const ch of [t.primary, t.primaryFg, t.primaryDeep, t.accent, t.accentFg]) {
      assert.match(ch, /^\d{1,3} \d{1,3} \d{1,3}$/, `${id} màu sai định dạng "R G B": ${ch}`);
    }
  }
});

test("isValidThemeId: chỉ true cho id preset", () => {
  assert.equal(isValidThemeId("cat_cafe"), true);
  assert.equal(isValidThemeId("cozy_cafe"), true);
  assert.equal(isValidThemeId("khong_co"), false);
  assert.equal(isValidThemeId(""), false);
  assert.equal(isValidThemeId(null), false);
  assert.equal(isValidThemeId(123), false);
});

test("resolveTheme: id hợp lệ → đúng theme", () => {
  assert.equal(resolveTheme("cat_cafe").id, "cat_cafe");
  assert.equal(resolveTheme("lofi_night").mascot, "🌙");
});

test("resolveTheme: id lạ/null/undefined → default cozy_cafe", () => {
  assert.equal(resolveTheme("khong_ton_tai").id, "cozy_cafe");
  assert.equal(resolveTheme(null).id, "cozy_cafe");
  assert.equal(resolveTheme(undefined).id, "cozy_cafe");
});

test("themeCssVars: trả 5 biến --color-* dạng kênh RGB", () => {
  const v = themeCssVars("cat_cafe");
  assert.deepEqual(Object.keys(v).sort(), [
    "--color-accent",
    "--color-accent-fg",
    "--color-primary",
    "--color-primary-deep",
    "--color-primary-fg",
  ]);
  assert.equal(v["--color-primary"], THEMES.cat_cafe.primary);
});

test("themeCssVars: id lạ → biến của cozy_cafe", () => {
  const v = themeCssVars("xxx");
  assert.equal(v["--color-primary"], THEMES.cozy_cafe.primary); // "15 118 110"
});
