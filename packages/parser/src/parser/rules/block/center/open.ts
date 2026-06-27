import type { ParseContext } from "../../types";

export interface CenterOpenResult {
  bodyStart: number;
  consumed: number;
}

export function parseCenterOpen(ctx: ParseContext): CenterOpenResult | null {
  const marker = ctx.tokens[ctx.pos];
  if (marker?.type !== "EQUALS" || !marker.lineStart) {
    return null;
  }

  let pos = ctx.pos + 1;
  let consumed = 1;

  if (ctx.tokens[pos]?.type !== "WHITESPACE") {
    return null;
  }

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  return { bodyStart: pos, consumed };
}
