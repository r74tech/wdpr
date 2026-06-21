import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";

export function isDivClose(ctx: ParseContext): boolean {
  const token = ctx.tokens[ctx.pos];
  if (token?.type !== "BLOCK_END_OPEN") return false;

  const closeNameResult = parseBlockName(ctx, ctx.pos + 1);
  return closeNameResult?.name === "div";
}

export function consumeDivClose(ctx: ParseContext, startPos: number): { pos: number; consumed: number } {
  let pos = startPos;
  let consumed = 0;

  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") {
    return { pos, consumed };
  }

  pos++;
  consumed++;

  const closeNameResult = parseBlockName(ctx, pos);
  if (closeNameResult) {
    pos += closeNameResult.consumed;
    consumed += closeNameResult.consumed;
  }
  if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
    pos++;
    consumed++;
  }
  if (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  return { pos, consumed };
}
