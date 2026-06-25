import type { ParseContext } from "../../types";

export const MAX_EXPRESSION_LENGTH = 256;

type ExprKeyword = "expr" | "if" | "ifexpr";

export type ExprOpenerResult =
  | { success: true; pos: number; consumed: number }
  | { success: false };

export function parseExprOpener(ctx: ParseContext, keyword: ExprKeyword): ExprOpenerResult {
  let pos = ctx.pos + 1;
  let consumed = 1;

  const hashToken = ctx.tokens[pos];
  if (!hashToken || hashToken.type !== "HASH") {
    return { success: false };
  }
  pos++;
  consumed++;

  const idToken = ctx.tokens[pos];
  if (!idToken || idToken.type !== "IDENTIFIER" || idToken.value !== keyword) {
    return { success: false };
  }
  pos++;
  consumed++;

  const nextPos = skipWhitespace(ctx, pos);
  consumed += nextPos - pos;

  return {
    success: true,
    pos: nextPos,
    consumed,
  };
}

export function skipWhitespace(ctx: ParseContext, startPos: number): number {
  let pos = startPos;
  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
  }
  return pos;
}
