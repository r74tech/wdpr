import type { ParseContext } from "../../types";

export interface IframeSourceResult {
  url: string;
  consumed: number;
}

export function parseIframeSource(ctx: ParseContext, startPos: number): IframeSourceResult | null {
  let pos = startPos;
  let url = "";

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token) break;
    if (token.type === "BLOCK_CLOSE" || token.type === "WHITESPACE" || token.type === "NEWLINE") {
      break;
    }
    url += token.value;
    pos++;
  }

  if (!url) return null;
  return { url, consumed: pos - startPos };
}
