import type { ParseContext } from "../../types";
import { parseBlockName } from "../../common";

export interface FootnoteCloseResult {
  consumed: number;
}

export function tryConsumeFootnoteClose(
  ctx: ParseContext,
  pos: number,
): FootnoteCloseResult | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") {
    return null;
  }

  const closeNameResult = parseBlockName(ctx, pos + 1);
  if (!closeNameResult || closeNameResult.name !== "footnote") {
    return null;
  }

  let closePos = pos + 1 + closeNameResult.consumed;
  let consumed = 1 + closeNameResult.consumed;

  while (ctx.tokens[closePos]?.type === "WHITESPACE") {
    closePos++;
    consumed++;
  }
  if (ctx.tokens[closePos]?.type === "BLOCK_CLOSE") {
    consumed++;
  }

  return { consumed };
}
