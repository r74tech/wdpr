import type { Element } from "@wdprlib/ast";
import type { TokenType } from "../../../../lexer";
import type { InlineRule, ParseContext, RuleResult } from "../../types";

export const newlineLineBreakRule: InlineRule = {
  name: "newlineLineBreak",
  startTokens: ["NEWLINE"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const currentTok = ctx.tokens[ctx.pos];
    if (!currentTok || currentTok.type !== "NEWLINE") {
      return { success: false };
    }

    const lookAhead = skipWhitespace(ctx, ctx.pos + 1) - ctx.pos;
    const nextMeaningfulToken = ctx.tokens[ctx.pos + lookAhead];
    const suppressLineBreak =
      !nextMeaningfulToken ||
      nextMeaningfulToken.type === "EOF" ||
      nextMeaningfulToken.type === "NEWLINE" ||
      isValidBlockStartAfterNewline(ctx, ctx.pos + lookAhead) ||
      hasBackslashBreakAfterNewline(ctx);

    if (suppressLineBreak) {
      return { success: true, elements: [], consumed: 1 };
    }

    return {
      success: true,
      elements: [{ element: "line-break" }],
      consumed: 1,
    };
  },
};

function isBlockStartToken(type: TokenType | undefined): boolean {
  switch (type) {
    case "BLOCKQUOTE_MARKER":
    case "LIST_BULLET":
    case "LIST_NUMBER":
    case "HEADING_MARKER":
    case "HR_MARKER":
    case "TABLE_MARKER":
      return true;
    default:
      return false;
  }
}

function isValidBlockStartAfterNewline(ctx: ParseContext, tokenPos: number): boolean {
  const token = ctx.tokens[tokenPos];
  if (!isBlockStartToken(token?.type) || !token?.lineStart) {
    return false;
  }

  if (token.type !== "HEADING_MARKER") {
    return true;
  }

  const markerLen = token.value.length;
  const afterMarker = ctx.tokens[tokenPos + 1];
  if (markerLen > 6) {
    return false;
  }
  if (afterMarker?.type === "STAR") {
    return ctx.tokens[tokenPos + 2]?.type === "WHITESPACE";
  }
  return afterMarker?.type === "WHITESPACE";
}

function hasBackslashBreakAfterNewline(ctx: ParseContext): boolean {
  const nextPos = skipWhitespace(ctx, ctx.pos + 1);
  return ctx.tokens[nextPos]?.type === "BACKSLASH_BREAK";
}

function skipWhitespace(ctx: ParseContext, startPos: number): number {
  let pos = startPos;
  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
  }
  return pos;
}
