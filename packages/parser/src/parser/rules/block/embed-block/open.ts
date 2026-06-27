import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";
import { isEmbedBlockName } from "./tags";

export interface EmbedBlockOpenResult {
  blockName: string;
  pos: number;
  consumed: number;
}

export function parseEmbedBlockOpen(
  ctx: ParseContext,
  startPos: number,
): EmbedBlockOpenResult | null {
  let pos = startPos;
  let consumed = 0;

  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") {
    return null;
  }
  pos++;
  consumed++;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult) {
    return null;
  }

  const blockName = nameResult.name.toLowerCase();
  if (!isEmbedBlockName(blockName)) {
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

  return {
    blockName,
    pos,
    consumed,
  };
}
