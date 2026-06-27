import type { ParseContext } from "../../types";
import { parseBlockName } from "../../common";
import { lookaheadHasHtmlClose } from "../../block/html";

export interface DisabledHtmlBody {
  consumed: number;
  foundClose: boolean;
}

export function consumeDisabledHtmlBody(ctx: ParseContext, startPos: number): DisabledHtmlBody {
  const hasCloseAhead = lookaheadHasHtmlClose(ctx, startPos);
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    if (!hasCloseAhead && token.type === "NEWLINE" && ctx.tokens[pos + 1]?.type === "NEWLINE") {
      break;
    }

    const closeResult = tryConsumeHtmlClose(ctx, pos);
    if (closeResult) {
      return {
        consumed: consumed + closeResult.consumed,
        foundClose: true,
      };
    }

    pos++;
    consumed++;
  }

  return { consumed, foundClose: false };
}

function tryConsumeHtmlClose(ctx: ParseContext, pos: number): { consumed: number } | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") {
    return null;
  }

  const closeNameResult = parseBlockName(ctx, pos + 1);
  if (closeNameResult?.name.toLowerCase() !== "html") {
    return null;
  }

  let checkPos = pos + 1 + closeNameResult.consumed;
  while (ctx.tokens[checkPos]?.type === "WHITESPACE") {
    checkPos++;
  }
  if (ctx.tokens[checkPos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  let consumed = checkPos - pos + 1;
  if (ctx.tokens[checkPos + 1]?.type === "NEWLINE") {
    consumed++;
  }

  return { consumed };
}
