/**
 *
 * Renderer for Wikidot table elements.
 *
 * @module
 */

import type { TableData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderTableAttrs } from "./attributes";
import { renderTableCell } from "./cell";

export function renderTable(ctx: RenderContext, data: TableData): void {
  const isPipeTable = data.attributes._source === "pipe";
  const classAttr = isPipeTable ? ' class="wiki-content-table"' : "";
  ctx.push(`<table${classAttr}${renderTableAttrs(data.attributes)}>`);

  for (const row of data.rows) {
    ctx.push(`<tr${renderTableAttrs(row.attributes)}>`);
    for (const cell of row.cells) {
      renderTableCell(ctx, cell);
    }
    ctx.push("</tr>");
  }

  ctx.push("</table>");
}
