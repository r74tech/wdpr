import type { ParseContext } from "../../types";

export function consumeHorizontalRuleLine(ctx: ParseContext): number {
  let pos = ctx.pos + 1;
  let consumed = 1;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      break;
    }
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type === "NEWLINE") {
    consumed++;
  }

  return consumed;
}
