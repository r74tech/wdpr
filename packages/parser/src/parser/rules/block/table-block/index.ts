/**
 *
 * Block rule for the explicit block-syntax table:
 * `[[table]][[row]][[cell]]...[[/cell]][[/row]][[/table]]`.
 *
 * This is the structured alternative to the pipe-syntax table (`||`).
 * Each element carries optional HTML attributes:
 *
 * ```
 * [[table class="wiki-table"]]
 *   [[row]]
 *     [[hcell style="width: 50%"]]Header[[/hcell]]
 *     [[cell colspan="2"]]Data[[/cell]]
 *   [[/row]]
 * [[/table]]
 * ```
 *
 * Key details:
 * - `[[hcell]]` produces header cells (`<th>`), `[[cell]]` produces data
 *   cells (`<td>`).
 * - `colspan` is extracted from cell attributes and mapped to `column-span`.
 * - Alignment can be derived from the `style` attribute's `text-align` value.
 * - Cell content supports both block and inline elements, including nested
 *   tables. The custom `parseCellContent()` handles paragraph wrapping
 *   and block detection within cells.
 * - Empty tables or tables with only empty rows fail the rule, falling
 *   back to text rendering.
 * - The table element carries `_source: "block"` in attributes to
 *   distinguish it from pipe-syntax tables.
 *
 * @module
 */
import type { Element, TableData } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseBlockName, parseAttributes } from "../utils";
import { collectTableBlockBody } from "./body";

/**
 * Block rule for `[[table]]...[[/table]]` with `[[row]]` and
 * `[[cell]]`/`[[hcell]]` children.
 */
export const tableBlockRule: BlockRule = {
  name: "table-block",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult || nameResult.name !== "table") {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    const attrResult = parseAttributes(ctx, pos);
    pos += attrResult.consumed;
    consumed += attrResult.consumed;

    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    const bodyResult = collectTableBlockBody(ctx, pos);
    consumed += bodyResult.consumed;

    if (!bodyResult.foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/table]] for [[table]]",
        position: openToken.position,
      });
    }

    const hasValidContent = bodyResult.rows.some((row) => row.cells.length > 0);
    if (!hasValidContent) {
      return { success: false };
    }

    const tableData: TableData = {
      attributes: { ...attrResult.attrs, _source: "block" },
      rows: bodyResult.rows,
    };

    return {
      success: true,
      elements: [
        {
          element: "table",
          data: tableData,
        },
      ],
      consumed,
    };
  },
};
