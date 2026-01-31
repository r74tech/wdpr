import type { Element, TableData, TableRow, TableCell, Alignment } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import type { TokenType } from "../../../lexer/tokens";
import { canApplyInlineRule } from "../inline/utils";

/**
 * Table column token types
 */
const TABLE_COL_TOKENS: TokenType[] = [
  "TABLE_MARKER",
  "TABLE_HEADER",
  "TABLE_LEFT",
  "TABLE_CENTER",
  "TABLE_RIGHT",
];

function isTableColToken(type: TokenType): boolean {
  return TABLE_COL_TOKENS.includes(type);
}

interface CellStart {
  align?: Alignment;
  header: boolean;
  colspan: number;
}

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
 * Parse cell start tokens to determine alignment, header status, and colspan
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
 * Trim leading and trailing whitespace text elements
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
