import type { ParseContext } from "../../types";

export interface ContentSeparatorSyntax {
  consumed: number;
}

export function parseContentSeparatorSyntax(ctx: ParseContext): ContentSeparatorSyntax | null {
  const first = ctx.tokens[ctx.pos];
  if (first?.type !== "EQUALS" || !first.lineStart) {
    return null;
  }

  let pos = ctx.pos;
  let equalsCount = 0;

  while (ctx.tokens[pos]?.type === "EQUALS") {
    equalsCount++;
    pos++;
  }

  if (equalsCount < 4) {
    return null;
  }

  const nextToken = ctx.tokens[pos];
  if (nextToken && nextToken.type !== "NEWLINE" && nextToken.type !== "EOF") {
    return null;
  }

  return {
    consumed: equalsCount + (nextToken?.type === "NEWLINE" ? 1 : 0),
  };
}
