import { protectedInlineRegionEnd } from "../raw/end";
import type { TokenType } from "../../../../lexer";
import type { ParseContext } from "../../types";
import { getParagraphNewlineBoundary } from "../parsing/paragraph-boundary";

export function findFormattingClose(
  ctx: ParseContext,
  start: number,
  marker: TokenType,
): number | null {
  const end = ctx.scope.inlineEnd ?? ctx.tokens.length;
  for (let pos = start; pos < end; pos++) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF" || ctx.scope.blockCloseCondition?.({ ...ctx, pos }))
      return null;
    if (
      token.type === "NEWLINE" &&
      getParagraphNewlineBoundary(ctx, pos, true).shouldBreak
    )
      return null;
    if (token.type === marker) return pos;
    const protectedEnd = protectedInlineRegionEnd(ctx.tokens, pos, end);
    if (protectedEnd > pos) pos = protectedEnd - 1;
  }
  return null;
}

export function consumeFormattingClose(
  _ctx: ParseContext,
  close: number,
  contentEnd: number,
): number {
  if (close === contentEnd) return 1;
  return 0;
}
