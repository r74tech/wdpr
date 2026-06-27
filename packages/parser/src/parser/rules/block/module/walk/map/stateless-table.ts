import type { Element, TableRow } from "@wdprlib/ast";

export function mapTableRows(
  rows: TableRow[],
  transform: (elements: Element[]) => Element[],
): TableRow[] {
  return rows.map((row) => ({
    ...row,
    cells: row.cells.map((cell) => ({ ...cell, elements: transform(cell.elements) })),
  }));
}
