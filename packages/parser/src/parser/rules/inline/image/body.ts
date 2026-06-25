import type { ParseContext } from "../../types";

export interface ImageSourceText {
  sourceText: string;
  consumed: number;
}

export function parseImageSourceText(ctx: ParseContext, startPos: number): ImageSourceText {
  let pos = startPos;
  let consumed = 0;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  let sourceText = "";
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "WHITESPACE" ||
      token.type === "BLOCK_CLOSE" ||
      token.type === "NEWLINE" ||
      token.type === "EOF"
    ) {
      break;
    }

    sourceText += token.value;
    pos++;
    consumed++;
  }

  return { sourceText, consumed };
}
