import type { TableCell, TableRow } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";
import { parseTableBlockCell } from "./cell";
import { consumeTableRowClose, isTableRowClose, parseTableRowOpen } from "./row-boundary";

/**
 * Parses a `[[row ...]]...[[/row]]` block, collecting its child cells.
 */
export function parseTableBlockRow(
  ctx: ParseContext,
  startPos: number,
): { row: TableRow; consumed: number } | null {
  const openResult = parseTableRowOpen(ctx, startPos);
  if (!openResult) {
    return null;
  }

  let pos = openResult.pos;
  let consumed = openResult.consumed;

  const cells: TableCell[] = [];
  let foundRowClose = false;

  while (pos < ctx.tokens.length) {
    while (ctx.tokens[pos]?.type === "WHITESPACE" || ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    if (isTableRowClose(ctx, pos)) {
      foundRowClose = true;
      const closeConsumed = consumeTableRowClose(ctx, pos);
      pos += closeConsumed;
      consumed += closeConsumed;
      break;
    }

    if (token.type === "BLOCK_OPEN") {
      const cellNameResult = parseBlockName(ctx, pos + 1);
      if (cellNameResult?.name === "cell" || cellNameResult?.name === "hcell") {
        const cellResult = parseTableBlockCell(ctx, pos);
        if (cellResult) {
          cells.push(cellResult.cell);
          pos += cellResult.consumed;
          consumed += cellResult.consumed;
          continue;
        }
      }
    }

    pos++;
    consumed++;
  }

  if (!foundRowClose) {
    ctx.diagnostics.push({
      severity: "warning",
      code: "unclosed-block",
      message: "Missing closing tag [[/row]] for [[row]]",
      position: ctx.tokens[startPos]?.position ?? {
        start: { line: 0, column: 0, offset: 0 },
        end: { line: 0, column: 0, offset: 0 },
      },
    });
  }

  return {
    row: {
      attributes: openResult.attrs,
      cells,
    },
    consumed,
  };
}
