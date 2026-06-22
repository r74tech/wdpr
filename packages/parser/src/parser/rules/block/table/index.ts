/**
 *
 * Block rule for Wikidot pipe-syntax tables.
 *
 * Wikidot tables are written using `||` delimiters at the start of a line:
 *
 * ```
 * || Cell 1 || Cell 2 ||
 * || Cell 3 || Cell 4 ||
 * ```
 *
 * Cell variants:
 * - `||` -- normal cell (`<td>`)
 * - `||~` -- header cell (`<th>`)
 * - `||<` -- left-aligned cell
 * - `||>` -- right-aligned cell (TABLE_RIGHT)
 * - `||=` -- center-aligned cell
 *
 * Colspan is achieved by using multiple consecutive `||` before content:
 * `||||` = colspan 2, `||||||` = colspan 3, etc.
 *
 * Key Wikidot behaviour:
 * - Cells MUST be terminated by another `||` (or variant). Unterminated
 *   cells (reaching end of line without a closing `||`) are discarded.
 * - If all cells in a row are unterminated, one empty cell is kept.
 * - Content within cells supports inline markup (bold, links, etc.).
 * - Leading and trailing whitespace in cell content is trimmed.
 *
 * The table element carries `_source: "pipe"` in its attributes to
 * distinguish it from block-syntax tables (`[[table]]`).
 *
 * @module
 */
import type { Element, TableData } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { isPipeTableToken, parsePipeTableRows } from "./pipe";

/**
 * Block rule for pipe-syntax tables.
 *
 * Parsing strategy:
 * 1. Verify the first token is a table column token at line start.
 * 2. Parse consecutive rows (each row is a line starting with a table
 *    column token).
 * 3. Each row is parsed by `parseTableRow()`, which iterates cells
 *    via `parseCellStart()` and `parseTableCell()`.
 * 4. Emit a `table` element with `_source: "pipe"`.
 */
export const tableRule: BlockRule = {
  name: "table",
  startTokens: ["TABLE_MARKER", "TABLE_HEADER", "TABLE_LEFT", "TABLE_CENTER", "TABLE_RIGHT"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const firstToken = currentToken(ctx);

    if (!firstToken.lineStart || !isPipeTableToken(firstToken.type)) {
      return { success: false };
    }

    const rowResult = parsePipeTableRows(ctx, ctx.pos);

    const tableData: TableData = {
      attributes: { _source: "pipe" },
      rows: rowResult.rows,
    };

    return {
      success: true,
      elements: [
        {
          element: "table",
          data: tableData,
        },
      ],
      consumed: rowResult.consumed,
    };
  },
};
