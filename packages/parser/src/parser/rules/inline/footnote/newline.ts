import type { ParseContext } from "../../types";

export interface FootnoteNewlineResult {
  consumed: number;
  paragraphBreak: boolean;
}

export function consumeFootnoteNewline(ctx: ParseContext, pos: number): FootnoteNewlineResult {
  let nextPos = pos + 1;
  let consumed = 1;

  while (ctx.tokens[nextPos]?.type === "WHITESPACE") {
    nextPos++;
    consumed++;
  }

  if (ctx.tokens[nextPos]?.type !== "NEWLINE") {
    return { consumed, paragraphBreak: false };
  }

  while (ctx.tokens[nextPos]?.type === "NEWLINE") {
    nextPos++;
    consumed++;
  }

  return { consumed, paragraphBreak: true };
}
