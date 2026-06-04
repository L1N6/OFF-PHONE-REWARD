/**
 * Sudoku tĩnh cho Phase 1 (specs §4 Module 2). MVP chỉ HIỂN THỊ (không chơi được) —
 * interactive là V2 (TV2-3). Pure data + validator → test offline (không DOM/DB).
 * 0 = ô trống.
 */
export type SudokuGrid = number[][];

// Puzzle hợp lệ kinh điển (mỗi hàng/cột/ô 3×3 không trùng 1–9).
export const SAMPLE_SUDOKU: SudokuGrid = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

/**
 * Kiểm tra lưới hợp lệ: không trùng số 1–9 trong bất kỳ hàng/cột/ô-3×3 nào (bỏ qua 0).
 * Không yêu cầu lưới đầy đủ — chỉ cần không vi phạm ràng buộc.
 */
export function isValidSudoku(grid: SudokuGrid): boolean {
  if (grid.length !== 9) return false;
  const rows = Array.from({ length: 9 }, () => new Set<number>());
  const cols = Array.from({ length: 9 }, () => new Set<number>());
  const boxes = Array.from({ length: 9 }, () => new Set<number>());
  for (let r = 0; r < 9; r++) {
    if (grid[r].length !== 9) return false;
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (v === 0) continue;
      if (!Number.isInteger(v) || v < 1 || v > 9) return false;
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      if (rows[r].has(v) || cols[c].has(v) || boxes[b].has(v)) return false;
      rows[r].add(v);
      cols[c].add(v);
      boxes[b].add(v);
    }
  }
  return true;
}
