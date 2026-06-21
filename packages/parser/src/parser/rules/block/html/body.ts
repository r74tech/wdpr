import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";

export interface HtmlBodyResult {
  contents: string;
  consumed: number;
  foundClose: boolean;
}

/**
 * Scan forward from `from` to see whether a real `[[/html]]` close tag
 * exists later in the token stream.
 */
export function lookaheadHasHtmlClose(ctx: ParseContext, from: number): boolean {
  for (let i = from; i < ctx.tokens.length; i++) {
    const token = ctx.tokens[i];
    if (!token || token.type === "EOF") return false;
    if (token.type !== "BLOCK_END_OPEN") continue;

    const closeName = parseBlockName(ctx, i + 1);
    if (closeName?.name.toLowerCase() !== "html") continue;

    let closePos = i + 1 + closeName.consumed;
    while (ctx.tokens[closePos]?.type === "WHITESPACE") closePos++;
    if (ctx.tokens[closePos]?.type === "BLOCK_CLOSE") return true;
  }
  return false;
}

export function collectHtmlBody(
  ctx: ParseContext,
  startPos: number,
  disabled: boolean,
): HtmlBodyResult {
  const hasCloseAhead = disabled && lookaheadHasHtmlClose(ctx, startPos);
  const contentParts: string[] = [];
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") break;

    if (
      disabled &&
      !hasCloseAhead &&
      token.type === "NEWLINE" &&
      ctx.tokens[pos + 1]?.type === "NEWLINE"
    ) {
      break;
    }

    if (isHtmlCloseAt(ctx, pos)) {
      return { contents: contentParts.join(""), consumed, foundClose: true };
    }

    if (!disabled) {
      contentParts.push(token.value);
    }
    pos++;
    consumed++;
  }

  return { contents: contentParts.join(""), consumed, foundClose: false };
}

export function consumeHtmlClose(ctx: ParseContext, startPos: number): number {
  let pos = startPos;
  let consumed = 0;

  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") {
    return 0;
  }

  pos++;
  consumed++;

  const closeNameResult = parseBlockName(ctx, pos);
  if (closeNameResult) {
    pos += closeNameResult.consumed;
    consumed += closeNameResult.consumed;
  }

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
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

function isHtmlCloseAt(ctx: ParseContext, pos: number): boolean {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") {
    return false;
  }

  const closeNameResult = parseBlockName(ctx, pos + 1);
  if (closeNameResult?.name.toLowerCase() !== "html") {
    return false;
  }

  let checkPos = pos + 1 + closeNameResult.consumed;
  while (ctx.tokens[checkPos]?.type === "WHITESPACE") checkPos++;
  return ctx.tokens[checkPos]?.type === "BLOCK_CLOSE";
}
