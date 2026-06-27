import type { ParseContext } from "../../types";
import { collectAnchorName } from "./name";

export function parseAnchorNameTarget(
  ctx: ParseContext,
  startPos: number,
): { name: string; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const hashToken = ctx.tokens[pos];
  if (
    !hashToken ||
    (hashToken.type !== "HASH" && !(hashToken.type === "TEXT" && hashToken.value === "#"))
  ) {
    return null;
  }
  pos++;
  consumed++;

  if (ctx.tokens[pos]?.type !== "WHITESPACE") {
    return null;
  }
  pos++;
  consumed++;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const nameResult = collectAnchorName(ctx, pos);
  if (!nameResult || ctx.tokens[pos + nameResult.consumed]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  return {
    name: nameResult.name,
    consumed: consumed + nameResult.consumed + 1,
  };
}
