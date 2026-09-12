import { emailRegionEnd } from "../email/candidates";
import { parseButtonSyntax } from "../button/syntax";
import { protectedInlineRegionEnd } from "../raw/end";
import type { TokenType } from "../../../../lexer";
import type { ParseContext } from "../../types";
import { getParagraphNewlineBoundary } from "../parsing/paragraph-boundary";

export function findFormattingClose(
  ctx: ParseContext,
  start: number,
  marker: TokenType,
): number | null {
  const table = ctx.scope.tableFormatting;
  const end = table?.end ?? ctx.scope.inlineEnd ?? ctx.tokens.length;
  for (let pos = start; pos < end; pos++) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF" || ctx.scope.blockCloseCondition?.({ ...ctx, pos }))
      return null;
    if (
      !table &&
      token.type === "NEWLINE" &&
      getParagraphNewlineBoundary(ctx, pos, true).shouldBreak
    )
      return null;
    const inlineRegionEnd = Math.max(
      emailRegionEnd(ctx.tokens, pos, end),
      parseButtonSyntax(ctx, pos, end)?.end ?? pos,
    );
    if (inlineRegionEnd > pos) {
      pos = inlineRegionEnd - 1;
      continue;
    }
    if (token.type === marker && !table?.suppressedClosers.has(pos)) return pos;
    const protectedEnd = protectedInlineRegionEnd(ctx.tokens, pos, end);
    if (protectedEnd > pos) pos = protectedEnd - 1;
  }
  return null;
}

export function consumeFormattingClose(
  ctx: ParseContext,
  close: number,
  contentEnd: number,
): number {
  if (close === contentEnd) return 1;
  // Wikidot closes formatting at the cell edge and suppresses its later delimiter.
  ctx.scope.tableFormatting?.suppressedClosers.add(close);
  return 0;
}
