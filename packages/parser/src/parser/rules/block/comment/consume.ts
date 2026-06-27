import type { ParseContext } from "../../types";

export interface BlockCommentConsumeResult {
  consumed: number;
}

export function consumeBlockComment(ctx: ParseContext): BlockCommentConsumeResult | null {
  let pos = ctx.pos + 1;
  let consumed = 1;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token) {
      break;
    }

    if (token.type === "COMMENT_CLOSE") {
      consumed++;
      pos++;

      if (ctx.tokens[pos]?.type === "NEWLINE") {
        consumed++;
      }

      return { consumed };
    }

    if (token.type === "EOF") {
      return null;
    }

    pos++;
    consumed++;
  }

  return null;
}
