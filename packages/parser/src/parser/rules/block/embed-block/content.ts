import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";
import { isEmbedBlockName } from "./tags";

export interface EmbedContentResult {
  contents: string;
  consumed: number;
  foundClose: boolean;
}

export function collectEmbedContent(ctx: ParseContext, startPos: number): EmbedContentResult {
  const contentParts: string[] = [];
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token) break;

    if (token.type === "BLOCK_END_OPEN") {
      const closeNameResult = parseBlockName(ctx, pos + 1);
      if (closeNameResult && isEmbedBlockName(closeNameResult.name.toLowerCase())) {
        return { contents: contentParts.join(""), consumed, foundClose: true };
      }
    }

    contentParts.push(token.value);
    pos++;
    consumed++;
  }

  return { contents: contentParts.join(""), consumed, foundClose: false };
}

export function consumeEmbedClose(ctx: ParseContext, startPos: number): number {
  let pos = startPos + 1;
  let consumed = 1;

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
    consumed++;
  }

  return consumed;
}
