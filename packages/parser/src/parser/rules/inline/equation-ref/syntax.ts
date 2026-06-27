import type { ParseContext } from "../../types";
import { parseBlockName } from "../../common";

export function parseEquationRefName(
  ctx: ParseContext,
  startPos: number,
): { name: string; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || nameResult.name.toLowerCase() !== "eref") {
    return null;
  }

  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  let refName = "";
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "BLOCK_CLOSE" || token.type === "NEWLINE") {
      break;
    }
    refName += token.value;
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  refName = refName.trim();
  if (!refName) {
    return null;
  }

  return { name: refName, consumed: consumed + 1 };
}
