import type { ParseContext } from "../../types";

export interface BracketLinkPrefix {
  target: "new-tab" | null;
  bodyStart: number;
  consumed: number;
}

export function parseBracketLinkPrefix(ctx: ParseContext, startPos: number): BracketLinkPrefix {
  if (ctx.tokens[startPos]?.type === "STAR") {
    return { target: "new-tab", bodyStart: startPos + 1, consumed: 1 };
  }

  return { target: null, bodyStart: startPos, consumed: 0 };
}
