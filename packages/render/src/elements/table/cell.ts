import type { TableCell } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderElements } from "../../render";
import { renderTableCellAttrs } from "./attributes";

export function renderTableCell(ctx: RenderContext, cell: TableCell): void {
  const tag = cell.header ? "th" : "td";
  const attrStr = renderTableCellAttrs(cell);

  ctx.push(`<${tag}${attrStr}>`);
  renderElements(ctx, cell.elements);
  ctx.push(`</${tag}>`);
}
