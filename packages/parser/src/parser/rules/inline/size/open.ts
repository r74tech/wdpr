import type { ParseContext } from "../../types";
import { parseBlockName } from "../../common";
import { parseSizeValue } from "./value";

export interface SizeOpenResult {
  size: string;
  bodyStart: number;
  consumed: number;
}

export function parseSizeOpen(ctx: ParseContext): SizeOpenResult | null {
  if (ctx.tokens[ctx.pos]?.type !== "BLOCK_OPEN") {
    return null;
  }

  let pos = ctx.pos + 1;
  let consumed = 1;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || nameResult.name !== "size") {
    return null;
  }

  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  const sizeResult = parseSizeValue(ctx, pos);
  if (!sizeResult) {
    return null;
  }

  pos += sizeResult.consumed;
  consumed += sizeResult.consumed;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  pos++;
  consumed++;

  return { size: sizeResult.size, bodyStart: pos, consumed };
}
