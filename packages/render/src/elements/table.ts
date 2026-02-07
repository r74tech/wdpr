/**
 *
 * Renderer for Wikidot table elements.
 *
 * Wikidot supports two table syntaxes:
 * - Pipe syntax (`||cell||cell||`) -- adds `class="wiki-content-table"`
 * - Block syntax (`[[table]]...[[/table]]`) -- no default class
 *
 * Both syntaxes support cell alignment (via tildes), column/row spans,
 * header cells (marked with `~`), and custom attributes on rows and cells.
 *
 * @module
 */

import type { TableData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, sanitizeAttributes } from "../escape";
import { renderElements } from "../render";

/**
 * Render a table element.
 *
 * Pipe-syntax tables receive `class="wiki-content-table"` on the `<table>`
 * element. Cell alignment is rendered as inline `text-align` styles.
 * Header cells use `<th>` instead of `<td>`. Column and row spans are
 * applied from the AST data and attributes, respectively.
 *
 * @param ctx - The current render context.
 * @param data - Table data with rows, cells, attributes, and source type.
 */
export function renderTable(ctx: RenderContext, data: TableData): void {
  // Only add wiki-content-table class for pipe syntax tables
  const isPipeTable = data.attributes._source === "pipe";
  const classAttr = isPipeTable ? ' class="wiki-content-table"' : "";
  ctx.push(`<table${classAttr}${renderTableAttrs(data.attributes)}>`);

  for (const row of data.rows) {
    ctx.push(`<tr${renderTableAttrs(row.attributes)}>`);

    for (const cell of row.cells) {
      const tag = cell.header ? "th" : "td";
      const attrs: string[] = [];
      const safeCellAttrs = sanitizeAttributes(cell.attributes);

      if (cell["column-span"] > 1) {
        attrs.push(`colspan="${cell["column-span"]}"`);
      }

      // Handle rowspan from attributes
      if (safeCellAttrs.rowspan) {
        const rowspan = parseInt(safeCellAttrs.rowspan, 10);
        if (rowspan > 1) {
          attrs.push(`rowspan="${rowspan}"`);
        }
      }

      if (cell.align) {
        const existingStyle = safeCellAttrs.style ?? "";
        const alignStyle = `text-align: ${cell.align};`;
        if (existingStyle) {
          attrs.push(`style="${escapeAttr(existingStyle + "; " + alignStyle)}"`);
        } else {
          attrs.push(`style="${alignStyle}"`);
        }
      }

      // Additional cell attributes
      for (const [key, value] of Object.entries(safeCellAttrs)) {
        if (key === "style" && cell.align) continue; // Already handled
        if (key === "rowspan") continue; // Already handled
        attrs.push(`${key}="${escapeAttr(value)}"`);
      }

      const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";
      ctx.push(`<${tag}${attrStr}>`);
      renderElements(ctx, cell.elements);
      ctx.push(`</${tag}>`);
    }

    ctx.push("</tr>");
  }

  ctx.push("</table>");
}

/**
 * Sanitize and render table-level or row-level attributes, excluding
 * internal `_`-prefixed keys.
 *
 * @param attributes - Raw attribute map from the AST.
 * @returns An HTML attribute string with leading space, or `""` if empty.
 */
function renderTableAttrs(attributes: Record<string, string>): string {
  const safe = sanitizeAttributes(attributes);
  let result = "";
  for (const [key, value] of Object.entries(safe)) {
    if (key.startsWith("_")) continue;
    result += ` ${key}="${escapeAttr(value)}"`;
  }
  return result;
}
