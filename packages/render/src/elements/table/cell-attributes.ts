import type { TableCell } from "@wdprlib/ast";
import { escapeAttr, sanitizeAttributes } from "../../escape";

export function renderTableCellAttrs(cell: TableCell): string {
  const attrs: string[] = [];
  const safeCellAttrs = sanitizeAttributes(cell.attributes);

  appendColumnSpan(attrs, cell);
  appendRowSpan(attrs, safeCellAttrs);
  appendAlignmentStyle(attrs, cell, safeCellAttrs);
  appendRemainingCellAttributes(attrs, cell, safeCellAttrs);

  return attrs.length > 0 ? " " + attrs.join(" ") : "";
}

function appendColumnSpan(attrs: string[], cell: TableCell): void {
  if (cell["column-span"] > 1) {
    attrs.push(`colspan="${cell["column-span"]}"`);
  }
}

function appendRowSpan(attrs: string[], safeCellAttrs: Record<string, string>): void {
  if (!safeCellAttrs.rowspan) {
    return;
  }

  const rowspan = parseInt(safeCellAttrs.rowspan, 10);
  if (rowspan > 1) {
    attrs.push(`rowspan="${rowspan}"`);
  }
}

function appendAlignmentStyle(
  attrs: string[],
  cell: TableCell,
  safeCellAttrs: Record<string, string>,
): void {
  if (!cell.align) {
    return;
  }

  const existingStyle = safeCellAttrs.style ?? "";
  const alignStyle = `text-align: ${cell.align};`;
  if (existingStyle) {
    attrs.push(`style="${escapeAttr(existingStyle + "; " + alignStyle)}"`);
  } else {
    attrs.push(`style="${alignStyle}"`);
  }
}

function appendRemainingCellAttributes(
  attrs: string[],
  cell: TableCell,
  safeCellAttrs: Record<string, string>,
): void {
  for (const key in safeCellAttrs) {
    if (key === "style" && cell.align) continue;
    if (key === "rowspan") continue;
    const value = safeCellAttrs[key]!;
    attrs.push(`${key}="${escapeAttr(value)}"`);
  }
}
