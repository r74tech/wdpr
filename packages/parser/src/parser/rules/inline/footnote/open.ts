import type { ParseContext } from "../../types";
import { parseBlockName } from "../../common";

export interface FootnoteOpenResult {
  bodyStart: number;
  consumed: number;
}

export function parseFootnoteOpen(ctx: ParseContext): FootnoteOpenResult | null {
  if (ctx.tokens[ctx.pos]?.type !== "BLOCK_OPEN") {
    return null;
  }

  let pos = ctx.pos + 1;
  let consumed = 1;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || nameResult.name !== "footnote") {
    return null;
  }

  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  pos++;
  consumed++;

  return { bodyStart: pos, consumed };
}
