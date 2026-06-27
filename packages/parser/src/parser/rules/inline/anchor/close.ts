import type { ParseContext } from "../../types";
import { isAnchorBlockName, parseAnchorBlockName } from "./syntax";

export function tryConsumeAnchorClose(
  ctx: ParseContext,
  pos: number,
  paragraphStrip: boolean,
): { consumed: number } | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") {
    return null;
  }

  const closeNameResult = parseAnchorBlockName(ctx, pos + 1);
  if (!closeNameResult || !isAnchorBlockName(closeNameResult.name)) {
    return null;
  }

  let consumed = 1 + closeNameResult.consumed;
  let closePos = pos + consumed;
  if (ctx.tokens[closePos]?.type === "BLOCK_CLOSE") {
    closePos++;
    consumed++;
  }

  if (
    paragraphStrip &&
    ctx.tokens[closePos]?.type === "NEWLINE" &&
    ctx.tokens[closePos + 1]?.type !== "NEWLINE"
  ) {
    consumed++;
  }

  return { consumed };
}
