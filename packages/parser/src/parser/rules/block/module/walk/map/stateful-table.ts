import type { Element, TableCell, TableRow } from "@wdprlib/ast";
import type { StatefulTransformResult } from "./types";

export function mapTableRowsWithState<S>(
  rows: TableRow[],
  state: S,
  transform: (elements: Element[], state: S) => StatefulTransformResult<S>,
): { rows: TableRow[]; state: S } {
  const newRows: TableRow[] = [];
  let currentState = state;

  for (const row of rows) {
    const newCells: TableCell[] = [];
    for (const cell of row.cells) {
      const result = transform(cell.elements, currentState);
      newCells.push({ ...cell, elements: result.elements });
      currentState = result.state;
    }
    newRows.push({ ...row, cells: newCells });
  }

  return { rows: newRows, state: currentState };
}
