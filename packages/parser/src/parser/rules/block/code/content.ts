import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";

export interface CodeContentResult {
  contents: string;
  consumed: number;
  foundClose: boolean;
}

export function collectCodeContent(
  ctx: ParseContext,
  startPos: number,
  closingSwallowed: boolean,
): CodeContentResult {
  const contentParts: string[] = [];
  let pos = startPos;
  let consumed = 0;
  let foundClose = closingSwallowed;

  while (!closingSwallowed && pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    if (token.type === "BLOCK_END_OPEN") {
      const closeNameResult = parseBlockName(ctx, pos + 1);
      if (closeNameResult?.name === "code") {
        foundClose = true;
        const closeConsumed = consumeCodeClose(ctx, pos, closeNameResult.consumed);
        consumed += closeConsumed;
        break;
      }
    }

    contentParts.push(token.value);
    pos++;
    consumed++;
  }

  return { contents: contentParts.join(""), consumed, foundClose };
}

function consumeCodeClose(ctx: ParseContext, startPos: number, closeNameConsumed: number): number {
  let pos = startPos + 1 + closeNameConsumed;
  let consumed = 1 + closeNameConsumed;

  if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
    pos++;
    consumed++;
  }

  return consumed;
}
