import { protectedInlineRegionEnd } from "../../../inline/raw/end";
import type { TableCell, TableRow } from "@wdprlib/ast";
import type { ParseContext } from "../../../types";
import { parseCellStart } from "./cell-start";
import { parseTableCell } from "./cell";
import { isPipeTableToken } from "./tokens";

export function parsePipeTableRows(
  ctx: ParseContext,
  startPos: number,
): { rows: TableRow[]; consumed: number } {
  let end = startPos;
  while (end < ctx.tokens.length && ctx.tokens[end]?.type !== "EOF") {
    const protectedEnd = protectedInlineRegionEnd(ctx.tokens, end, ctx.tokens.length);
    if (protectedEnd > end) {
      end = protectedEnd;
      continue;
    }
    if (
      ctx.tokens[end]?.type === "NEWLINE" &&
      !isPipeTableToken(ctx.tokens[end + 1]?.type ?? "EOF") &&
      !(ctx.tokens[end - 1]?.type === "UNDERSCORE" && ctx.tokens[end - 2]?.type === "WHITESPACE")
    )
      break;
    end++;
  }
  const tableCtx: ParseContext = {
    ...ctx,
    scope: { ...ctx.scope, tableFormatting: { end, suppressedClosers: new Set() } },
  };
  const rows: TableRow[] = [];
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];

    if (!token || !token.lineStart || !isPipeTableToken(token.type)) {
      break;
    }

    const rowResult = parseTableRow(tableCtx, pos);
    rows.push(rowResult.row);
    pos += rowResult.consumed;
    consumed += rowResult.consumed;
  }

  return { rows, consumed };
}

function parseTableRow(ctx: ParseContext, startPos: number): { row: TableRow; consumed: number } {
  const cells: TableCell[] = [];
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      break;
    }

    const startResult = parseCellStart(ctx, pos);
    if (!startResult) {
      break;
    }

    pos += startResult.consumed;
    consumed += startResult.consumed;

    const nextToken = ctx.tokens[pos];
    if (!nextToken || nextToken.type === "NEWLINE" || nextToken.type === "EOF") {
      break;
    }

    const cellResult = parseTableCell(ctx, pos, startResult.cellStart);
    if (cellResult.terminatedProperly) {
      cells.push(cellResult.cell);
    }
    pos += cellResult.consumed;
    consumed += cellResult.consumed;
  }

  if (ctx.tokens[pos]?.type === "NEWLINE") {
    consumed++;
  }

  if (cells.length === 0) {
    cells.push(createEmptyTableCell());
  }

  return {
    row: {
      attributes: {},
      cells,
    },
    consumed,
  };
}

function createEmptyTableCell(): TableCell {
  return {
    header: false,
    "column-span": 1,
    align: null,
    attributes: {},
    elements: [],
  };
}
