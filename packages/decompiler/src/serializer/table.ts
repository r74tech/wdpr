import type { TableData } from "@wdprlib/ast";
import { SerializeContext } from "./context";
import { serializeElements } from "./serialize-element";

/**
 * Serialize a table element to Wikidot pipe (`||`) syntax.
 *
 * Each cell is delimited by `||`. Header cells use `~`, alignment uses
 * `=` (center), `>` (right), or `<` (left). Colspan is represented by
 * additional `||` pairs before the cell marker.
 */
export function serializeTable(ctx: SerializeContext, data: TableData): void {
  for (const row of data.rows) {
    for (const cell of row.cells) {
      // colspan: extra || pairs before the alignment/header marker
      let prefix = "||";
      for (let i = 1; i < cell["column-span"]; i++) {
        prefix += "||";
      }

      if (cell.header) {
        prefix += "~";
      } else if (cell.align === "center") {
        prefix += "=";
      } else if (cell.align === "right") {
        prefix += ">";
      } else if (cell.align === "left") {
        prefix += "<";
      }

      // Serialize cell content
      // Force ` _\n` syntax for line breaks inside pipe table cells,
      // since bare newlines would break the row structure.
      const innerCtx = new SerializeContext({ newline: ctx.newline });
      innerCtx.forceLineBreakSyntax = true;
      innerCtx.inParagraph = true;
      serializeElements(innerCtx, cell.elements);
      const raw = innerCtx.getOutput();
      const content = raw.replace(/\n$/, "");

      // When content ends with ` _` (from a trailing line-break that was
      // serialised as ` _\n`), preserve the newline so the closing `||`
      // appears on the next line — otherwise the parser sees literal `_`.
      const nl = ctx.newline;
      if (raw.endsWith(` _${nl}`)) {
        ctx.push(`${prefix} ${content}${nl}`);
      } else {
        ctx.push(`${prefix} ${content} `);
      }
    }
    ctx.pushLine("||");
  }
  ctx.requestBlankLine();
}
