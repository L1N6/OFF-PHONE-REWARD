import { type SudokuGrid } from "../../lib/sudoku";

/**
 * Lưới Sudoku 9×9 TĨNH (specs §4 Module 2, Phase 1). Chỉ hiển thị (MVP) —
 * border dày ở biên ô 3×3 để phân vùng rõ. 0 = ô trống.
 */
export function Sudoku({ grid }: { grid: SudokuGrid }) {
  return (
    <div className="mx-auto grid w-full max-w-xs grid-cols-9 overflow-hidden rounded-md border-2 border-slate-700 bg-white text-slate-900 shadow-lg">
      {grid.flatMap((row, r) =>
        row.map((val, c) => {
          const thickTop = r % 3 === 0 && r !== 0;
          const thickLeft = c % 3 === 0 && c !== 0;
          return (
            <div
              key={`${r}-${c}`}
              className={[
                "flex aspect-square items-center justify-center border border-slate-300 text-sm font-semibold sm:text-base",
                thickTop ? "border-t-2 border-t-slate-700" : "",
                thickLeft ? "border-l-2 border-l-slate-700" : "",
              ].join(" ")}
            >
              {val !== 0 ? val : ""}
            </div>
          );
        }),
      )}
    </div>
  );
}
