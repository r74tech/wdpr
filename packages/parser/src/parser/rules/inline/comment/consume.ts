import type { ParseContext } from "../../types";

export interface CommentConsumeResult {
  consumed: number;
  foundClose: boolean;
}

export function consumeInlineComment(ctx: ParseContext, startPos: number): CommentConsumeResult {
  let pos = startPos + 1;
  let consumed = 1;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token) {
      break;
    }

    if (token.type === "COMMENT_CLOSE") {
      return { consumed: consumed + 1, foundClose: true };
    }

    if (token.type === "EOF") {
      return { consumed, foundClose: false };
    }

    pos++;
    consumed++;
  }

  return { consumed, foundClose: false };
}
