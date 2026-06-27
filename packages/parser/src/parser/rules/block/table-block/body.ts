import type { TableRow } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";
import { parseTableBlockRow } from "./structure";

export interface TableBlockBodyResult {
  rows: TableRow[];
  consumed: number;
  foundClose: boolean;
}

export function collectTableBlockBody(ctx: ParseContext, startPos: number): TableBlockBodyResult {
  const rows: TableRow[] = [];
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    while (ctx.tokens[pos]?.type === "WHITESPACE" || ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    const closeConsumed = consumeTableClose(ctx, pos);
    if (closeConsumed !== null) {
      return {
        rows,
        consumed: consumed + closeConsumed,
        foundClose: true,
      };
    }

    if (token.type === "BLOCK_OPEN") {
      const rowNameResult = parseBlockName(ctx, pos + 1);
      if (rowNameResult?.name === "row") {
        const rowResult = parseTableBlockRow(ctx, pos);
        if (rowResult) {
          rows.push(rowResult.row);
          pos += rowResult.consumed;
          consumed += rowResult.consumed;
          continue;
        }
      }
    }

    pos++;
    consumed++;
  }

  return { rows, consumed, foundClose: false };
}

function consumeTableClose(ctx: ParseContext, startPos: number): number | null {
  if (ctx.tokens[startPos]?.type !== "BLOCK_END_OPEN") {
    return null;
  }

  const closeNameResult = parseBlockName(ctx, startPos + 1);
  if (closeNameResult?.name !== "table") {
    return null;
  }

  let pos = startPos + 1 + closeNameResult.consumed;
  let consumed = 1 + closeNameResult.consumed;

  if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
    pos++;
    consumed++;
  }
  if (ctx.tokens[pos]?.type === "NEWLINE") {
    consumed++;
  }

  return consumed;
}
