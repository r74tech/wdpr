import type { Token, TokenType } from "../../lexer";
import type { ParseContext } from "./contracts";
import { getParagraphNewlineBoundary } from "./inline/parsing/paragraph-boundary";

/**
 * Helper to get current token
 */
export function currentToken(ctx: ParseContext): Token {
  return ctx.tokens[ctx.pos] ?? eofToken();
}

/**
 * Helper to peek ahead
 */
export function peekToken(ctx: ParseContext, n = 1): Token {
  return ctx.tokens[ctx.pos + n] ?? eofToken();
}

/**
 * Helper to check token type
 */
export function checkToken(ctx: ParseContext, type: TokenType): boolean {
  return currentToken(ctx).type === type;
}

/**
 * Helper to check if at end
 */
export function isAtEnd(ctx: ParseContext): boolean {
  return ctx.pos >= ctx.tokens.length || currentToken(ctx).type === "EOF";
}

/**
 * Create EOF token
 */
function eofToken(): Token {
  return {
    type: "EOF",
    value: "",
    position: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
    lineStart: false,
  };
}

/**
 * Check if closing marker exists before newline.
 * If markerValue is provided, also check that the token value matches.
 */
export function hasClosingMarkerBeforeNewline(
  ctx: ParseContext,
  markerType: TokenType,
  markerValue?: string,
): boolean {
  let pos = ctx.pos;
  while (pos < (ctx.scope.inlineEnd ?? ctx.tokens.length)) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      return false;
    }
    if (token.type === markerType) {
      if (markerValue === undefined || token.value === markerValue) {
        return true;
      }
    }
    pos++;
  }
  return false;
}

/**
 * Check if closing marker exists before paragraph break (double newline).
 * Allows inline formatting to span multiple lines within a paragraph.
 */
export function hasClosingMarkerBeforeParagraphBreak(
  ctx: ParseContext,
  markerType: TokenType,
  markerValue?: string,
): boolean {
  let pos = ctx.pos;
  while (pos < (ctx.scope.inlineEnd ?? ctx.tokens.length)) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      return false;
    }
    if (ctx.scope.blockCloseCondition?.({ ...ctx, pos })) return false;
    if (token.type === "NEWLINE" && getParagraphNewlineBoundary(ctx, pos, true).shouldBreak) {
      return false;
    }
    if (token.type === markerType) {
      if (markerValue === undefined || token.value === markerValue) {
        return true;
      }
    }
    pos++;
  }
  return false;
}
