import type { Token, TokenType } from "../../lexer";
import type { Version, WikitextSettings, Diagnostic } from "@wdprlib/ast";
import type { Element, CodeBlockData, TocEntry } from "@wdprlib/ast";

/**
 * Parser context passed to rules
 */
export interface ParseContext {
  tokens: Token[];
  pos: number;
  version: Version;
  trackPositions: boolean;
  settings: WikitextSettings;
  // Collections for SyntaxTree output
  footnotes: Element[][];
  tocEntries: TocEntry[];
  codeBlocks: CodeBlockData[];
  htmlBlocks: string[];
  // State flags
  footnoteBlockParsed: boolean;
  // Bibliography citation labels collected during parsing
  bibcites: string[];
  // Rules (injected to avoid circular dependency)
  blockRules: BlockRule[];
  blockFallbackRule: BlockRule;
  inlineRules: InlineRule[];
  // Close condition for current block (passed to paragraph parser)
  blockCloseCondition?: (ctx: ParseContext) => boolean;
  // Diagnostics collected during parsing
  diagnostics: Diagnostic[];
  // Budget for div nesting: tracks how many more nested divs can open.
  // When 0, div rule fails (innermost excess opens become text).
  // undefined means "not yet calculated" (top-level or non-div context).
  divClosesBudget?: number;
}

/**
 * Result of a rule attempt
 * Returns elements array None/Single/Multiple
 *
 * During migration: T can be either internal AST node or Element
 */
export type RuleResult<T> = { success: true; elements: T[]; consumed: number } | { success: false };

/**
 * Block rule interface
 */
export interface BlockRule {
  /** Rule name for debugging */
  name: string;
  /** Token types that can start this rule */
  startTokens: TokenType[];
  /** Whether this rule requires line start */
  requiresLineStart: boolean;
  /** Try to parse this block */
  parse(ctx: ParseContext): RuleResult<Element>;
  /**
   * Check if tokens at the given position match this rule's start pattern.
   * Used by inline parser to determine behavior before a block boundary
   * (e.g. whether to generate a trailing line-break).
   */
  isStartPattern?(ctx: ParseContext, pos: number): boolean;
  /**
   * When true, a single newline before this block becomes a line-break.
   * Wikidot's Divalign expands content inline, so \n before nested blocks
   * becomes <br />. Other blocks (Code, Div, etc.) suppress this.
   */
  preservesPrecedingLineBreak?: boolean;
}

/**
 * Inline rule interface
 */
export interface InlineRule {
  /** Rule name for debugging */
  name: string;
  /** Token types that can start this rule */
  startTokens: TokenType[];
  /** Try to parse this inline element */
  parse(ctx: ParseContext): RuleResult<Element>;
}

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
 * Check if closing marker exists before newline
 * If markerValue is provided, also check that the token value matches
 */
export function hasClosingMarkerBeforeNewline(
  ctx: ParseContext,
  markerType: TokenType,
  markerValue?: string,
): boolean {
  let pos = ctx.pos;
  while (pos < ctx.tokens.length) {
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
 * Check if closing marker exists before paragraph break (double newline)
 * Allows inline formatting to span multiple lines within a paragraph
 */
export function hasClosingMarkerBeforeParagraphBreak(
  ctx: ParseContext,
  markerType: TokenType,
  markerValue?: string,
): boolean {
  let pos = ctx.pos;
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      return false;
    }
    // Check for paragraph break (NEWLINE followed by NEWLINE after optional whitespace)
    if (token.type === "NEWLINE") {
      let lookAhead = 1;
      while (ctx.tokens[pos + lookAhead]?.type === "WHITESPACE") {
        lookAhead++;
      }
      if (
        ctx.tokens[pos + lookAhead]?.type === "NEWLINE" ||
        ctx.tokens[pos + lookAhead]?.type === "EOF" ||
        !ctx.tokens[pos + lookAhead]
      ) {
        return false; // Paragraph break - stop
      }
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
