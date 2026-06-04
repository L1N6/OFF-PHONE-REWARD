import { test } from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_SUDOKU, isValidSudoku } from "../lib/sudoku";

test("SAMPLE_SUDOKU là lưới 9×9, mọi ô là số nguyên 0–9", () => {
  assert.equal(SAMPLE_SUDOKU.length, 9);
  for (const row of SAMPLE_SUDOKU) {
    assert.equal(row.length, 9);
    for (const v of row) {
      assert.ok(Number.isInteger(v) && v >= 0 && v <= 9, `ô không hợp lệ: ${v}`);
    }
  }
});

test("SAMPLE_SUDOKU hợp lệ (không trùng 1–9 trong hàng/cột/ô 3×3)", () => {
  assert.equal(isValidSudoku(SAMPLE_SUDOKU), true);
});

test("isValidSudoku bắt lỗi: trùng số trong hàng", () => {
  const bad = SAMPLE_SUDOKU.map((r) => [...r]);
  bad[0][2] = 5; // hàng 0 đã có 5 ở cột 0 → trùng
  assert.equal(isValidSudoku(bad), false);
});

test("isValidSudoku bắt lỗi: trùng số trong ô 3×3", () => {
  const bad = SAMPLE_SUDOKU.map((r) => [...r]);
  bad[2][2] = 3; // ô(0,0) đã có 3 ở (0,1) → trùng trong box
  assert.equal(isValidSudoku(bad), false);
});
