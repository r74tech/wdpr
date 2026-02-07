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
import type { Element, TableData, TableRow, TableCell, Alignment } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import type { TokenType } from "../../../lexer/tokens";
import { canApplyInlineRule } from "../inline/utils";

/** Token types that begin a table cell or act as cell delimiters. */
const TABLE_COL_TOKENS: TokenType[] = [
  "TABLE_MARKER",
  "TABLE_HEADER",
  "TABLE_LEFT",
  "TABLE_CENTER",
  "TABLE_RIGHT",
];

/**
 * Tests whether a token type is one of the table column delimiters.
 *
 * @param type - The token type to check.
 * @returns `true` if the type starts or delimits a table cell.
 */
function isTableColToken(type: TokenType): boolean {
  return TABLE_COL_TOKENS.includes(type);
}

/**
 * Describes the opening properties of a table cell, determined by
 * the sequence of column delimiter tokens at the start of the cell.
 */
interface CellStart {
  /** Explicit alignment if a styled token (`||<`, `||=`, `||>`) was used. */
  align?: Alignment;
  /** Whether this is a header cell (`||~`). */
  header: boolean;
  /** Colspan count: consecutive `||` tokens increment this. */
  colspan: number;
}

/**
 * Block rule for pipe-syntax tables.
 *
 * Parsing strategy:
 * 1. Verify the first token is a table column token at line start.
 * 2. Parse consecutive rows (each row is a line starting with a table
 *    column token).
 * 3. Each row is parsed by {@link parseTableRow}, which iterates cells
 *    via {@link parseCellStart} and {@link parseTableCell}.
 * 4. Emit a `table` element with `_source: "pipe"`.
 */
export const tableRule: BlockRule = {
  name: "table",
  startTokens: ["TABLE_MARKER", "TABLE_HEADER", "TABLE_LEFT", "TABLE_CENTER", "TABLE_RIGHT"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const firstToken = currentToken(ctx);

    if (!firstToken.lineStart || !isTableColToken(firstToken.type)) {
      return { success: false };
    }

    const rows: TableRow[] = [];
    let pos = ctx.pos;
    let consumed = 0;

    // Parse rows
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];

      if (!token || !token.lineStart || !isTableColToken(token.type)) {
        break;
      }

      const rowResult = parseTableRow(ctx, pos);
      rows.push(rowResult.row);
      pos += rowResult.consumed;
      consumed += rowResult.consumed;
    }

    const tableData: TableData = {
      attributes: { _source: "pipe" },
      rows,
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

/**
 * Parses the cell-start delimiter tokens to determine alignment, header
 * status, and colspan.
 *
 * Multiple consecutive TABLE_MARKER tokens (`||`) increase the colspan
 * count. A styled token (`||~`, `||<`, `||=`, `||>`) ends the sequence
 * and sets the corresponding property.
 *
 * @param ctx      - Parse context.
 * @param startPos - Token index of the first delimiter token.
 * @returns The cell properties and consumed count, or `null` if no cell.
 */
function parseCellStart(
  ctx: ParseContext,
  startPos: number,
): { cellStart: CellStart; consumed: number } | null {
  let pos = startPos;
  let colspan = 0;
  let align: Alignment | undefined;
  let header = false;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token) break;

    if (token.type === "TABLE_HEADER") {
      colspan++;
      header = true;
      pos++;
      // Styled token ends the colspan counting
      break;
    }
    if (token.type === "TABLE_LEFT") {
      colspan++;
      align = "left";
      pos++;
      break;
    }
    if (token.type === "TABLE_CENTER") {
      colspan++;
      align = "center";
      pos++;
      break;
    }
    if (token.type === "TABLE_RIGHT") {
      colspan++;
      align = "right";
      pos++;
      break;
    }
    if (token.type === "TABLE_MARKER") {
      colspan++;
      pos++;
      // Keep checking for more column markers (colspan)
      continue;
    }
    // No more table column tokens
    if (colspan > 0) {
      return {
        cellStart: { align, header, colspan },
        consumed: pos - startPos,
      };
    }
    return null;
  }

  if (colspan > 0) {
    return {
      cellStart: { align, header, colspan },
      consumed: pos - startPos,
    };
  }

  return null;
}

/**
 * Parses a single table row (one line of `||`-delimited cells).
 *
 * Cells are collected until end of line. Only properly terminated cells
 * (followed by another `||` token) are added to the row. If all cells
 * are unterminated, one empty cell is kept as a placeholder.
 *
 * @param ctx      - Parse context.
 * @param startPos - Token index at the first cell delimiter of the row.
 * @returns The parsed row and consumed token count.
 */
function parseTableRow(ctx: ParseContext, startPos: number): { row: TableRow; consumed: number } {
  const cells: TableCell[] = [];
  let pos = startPos;
  let consumed = 0;

  // Parse cells until end of line
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      break;
    }

    // Parse cell start
    const startResult = parseCellStart(ctx, pos);
    if (!startResult) {
      // Not a cell start, break
      break;
    }

    pos += startResult.consumed;
    consumed += startResult.consumed;

    // Check if end of row (followed by newline/EOF)
    const nextToken = ctx.tokens[pos];
    if (!nextToken || nextToken.type === "NEWLINE" || nextToken.type === "EOF") {
      break;
    }

    // Parse cell content
    const cellResult = parseTableCell(ctx, pos, startResult.cellStart);
    // Only add properly terminated cells to the row
    // Wikidot behavior: cells without closing || are discarded
    if (cellResult.terminatedProperly) {
      cells.push(cellResult.cell);
    }
    pos += cellResult.consumed;
    consumed += cellResult.consumed;
  }

  // Consume newline
  if (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  // Wikidot behavior: if all cells are unterminated, keep one empty cell
  // This handles cases like "|| Missing end" which produces one empty cell
  if (cells.length === 0) {
    cells.push({
      header: false,
      "column-span": 1,
      align: null,
      attributes: {},
      elements: [],
    });
  }

  return {
    row: {
      attributes: {},
      cells,
    },
    consumed,
  };
}

/**
 * Parses the content of a single table cell.
 *
 * Inline content is collected until the next table column token or end
 * of line. If the cell is not terminated by a column token, its content
 * is discarded (`terminatedProperly: false`), matching Wikidot behaviour.
 *
 * @param ctx       - Parse context.
 * @param startPos  - Token index after the cell-start delimiter.
 * @param cellStart - Properties from the cell-start delimiter sequence.
 * @returns The parsed cell, consumed count, and termination status.
 */
function parseTableCell(
  ctx: ParseContext,
  startPos: number,
  cellStart: CellStart,
): { cell: TableCell; consumed: number; terminatedProperly: boolean } {
  let pos = startPos;
  let consumed = 0;
  const children: Element[] = [];

  // Skip leading whitespace
  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const { inlineRules } = ctx;

  // Parse inline content until next table column token or newline
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      break;
    }
    // Stop at table column tokens
    if (isTableColToken(token.type)) {
      break;
    }

    // Skip whitespace between tokens but preserve it as text if not at start
    if (token.type === "WHITESPACE") {
      children.push({ element: "text", data: token.value });
      pos++;
      consumed++;
      continue;
    }

    // Try each inline rule
    const inlineCtx: ParseContext = { ...ctx, pos };
    let matched = false;

    for (const rule of inlineRules) {
      if (canApplyInlineRule(rule, token)) {
        const result = rule.parse(inlineCtx);
        if (result.success) {
          children.push(...result.elements);
          consumed += result.consumed;
          pos += result.consumed;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Fallback to text
      children.push({ element: "text", data: token.value });
      consumed++;
      pos++;
    }
  }

  // Check if cell is properly terminated with table column token
  // Wikidot behavior: cells without proper termination have empty content
  const currentToken = ctx.tokens[pos];
  const terminatedProperly = currentToken ? isTableColToken(currentToken.type) : false;

  // Trim leading/trailing whitespace from children
  const trimmedChildren = terminatedProperly ? trimElements(children) : [];

  return {
    cell: {
      header: cellStart.header,
      "column-span": cellStart.colspan,
      align: terminatedProperly ? (cellStart.align ?? null) : null,
      attributes: {},
      elements: trimmedChildren,
    },
    consumed,
    terminatedProperly,
  };
}

/**
 * Trims leading and trailing whitespace-only text elements from an array.
 *
 * Partial whitespace at the edges is trimmed in-place (e.g. `"  foo"` becomes
 * `"foo"` if it is the first element). Non-text elements are left untouched.
 *
 * @param elements - The element array to trim.
 * @returns A new array with edge whitespace removed.
 */
function trimElements(elements: Element[]): Element[] {
  const result = [...elements];

  // Trim leading whitespace
  while (result.length > 0) {
    const first = result[0];
    if (first?.element === "text" && typeof first.data === "string") {
      const trimmed = first.data.trimStart();
      if (trimmed === "") {
        result.shift();
      } else {
        result[0] = { element: "text", data: trimmed };
        break;
      }
    } else {
      break;
    }
  }

  // Trim trailing whitespace
  while (result.length > 0) {
    const last = result[result.length - 1];
    if (last?.element === "text" && typeof last.data === "string") {
      const trimmed = last.data.trimEnd();
      if (trimmed === "") {
        result.pop();
      } else {
        result[result.length - 1] = { element: "text", data: trimmed };
        break;
      }
    } else {
      break;
    }
  }

  return result;
}
