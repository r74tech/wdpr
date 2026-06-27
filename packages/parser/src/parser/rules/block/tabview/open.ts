import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";

export interface TabviewOpenResult {
  blockName: string;
  consumed: number;
}

export function parseTabviewOpen(ctx: ParseContext, startPos: number): TabviewOpenResult | null {
  if (ctx.tokens[startPos]?.type !== "BLOCK_OPEN") {
    return null;
  }

  let pos = startPos + 1;
  let consumed = 1;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult) {
    return null;
  }

  const blockName = nameResult.name.toLowerCase();
  if (blockName !== "tabview" && blockName !== "tabs") {
    return null;
  }

  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  while (
    pos < ctx.tokens.length &&
    ctx.tokens[pos]?.type !== "BLOCK_CLOSE" &&
    ctx.tokens[pos]?.type !== "NEWLINE"
  ) {
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }
  pos++;
  consumed++;

  if (ctx.tokens[pos]?.type === "NEWLINE") {
    consumed++;
  }

  return { blockName, consumed };
}
