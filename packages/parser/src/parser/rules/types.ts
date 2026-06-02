import type { Token, TokenType } from "../../lexer";
import type { Version, WikitextSettings, Diagnostic } from "@wdprlib/ast";
import type { Element, CodeBlockData, TocEntry } from "@wdprlib/ast";

/**
 * Per-scope state propagated by spread + override semantics.
 *
 * Every field is `readonly` so a rule cannot accidentally mutate the
 * parent scope by writing through a shared reference. Updates must be
 * expressed as a replacement: `ctx.scope = { ...ctx.scope, X: ... }`
 * (or, more commonly, by constructing a new child context with the
 * desired scope override).
 *
 * The motivation is to keep speculative parse rollback safe: when a
 * block rule fails, any scope it built up is discarded with the failed
 * context. A shared-state design that mutates fields in place does not
 * survive rollback — grouping per-scope fields here and forbidding
 * nested mutation makes the semantics explicit at the type level.
 */
export interface ScopeContext {
  /**
   * Close condition for the current block. The paragraph parser calls
   * it to decide when to stop collecting inline content.
   */
  readonly blockCloseCondition?: (ctx: ParseContext) => boolean;
  /**
   * Block names excluded from paragraph-boundary detection. When a
   * BLOCK_OPEN/BLOCK_END_OPEN for an excluded name appears at line
   * start, the inline parser does NOT treat it as a paragraph break.
   * Used by `[[collapsible]]` to prevent nested `[[collapsible]]` from
   * splitting paragraphs.
   */
  readonly excludedBlockNames?: ReadonlySet<string>;
  /**
   * Budget for div nesting: tracks how many more nested divs can open.
   * When 0, the div rule fails (innermost excess opens become text).
   * `undefined` means "not yet calculated" (top-level or non-div context).
   */
  readonly divClosesBudget?: number;
  /**
   * Used by the footnote-block rule to reject duplicate occurrences.
   *
   * **Scope is per spread copy of `ParseContext`, not document-global.**
   * `parseBlocksUntil` creates a fresh `{ ...ctx, pos, ... }` on every
   * iteration, so the flag does not propagate between sibling rules in
   * a body, between sibling bodies, or up to the top-level parser.
   *
   * Practical effect today:
   * - Two `[[footnoteblock]]` at the top level: the second one fails
   *   (the top-level dispatch hands the parser's own `ctx` to rules,
   *   so mutations are visible to the next top-level iteration).
   * - Two `[[footnoteblock]]` inside the same body, or across nested
   *   bodies: both currently succeed, even though Wikidot's
   *   "first-only" rule should reject the duplicate.
   *
   * Fixing the cross-scope case requires either an AST-level dedup pass
   * after parsing (similar to the auto-append walk) or a shared-state
   * design with proper rollback for speculative parses. Tracked
   * separately; this flag intentionally keeps the original primitive
   * semantics to avoid regressing the top-level duplicate-rejection
   * test fixtures.
   *
   * The auto-append decision in `Parser.parse` deliberately ignores
   * this flag and walks the final AST instead — see `containsFootnoteBlock`.
   */
  readonly footnoteBlockParsed: boolean;
}

/**
 * Parser context passed to rules.
 *
 * Fields are grouped by lifecycle:
 * - Static config (`tokens`, `version`, `trackPositions`, `settings`,
 *   rule arrays): constructor-fixed.
 * - `pos`: per-scope cursor; kept top-level for ergonomics because
 *   every rule spread overrides it.
 * - Accumulators (`footnotes`, `tocEntries`, …, `diagnostics`):
 *   reference-shared via array identity across spreads.
 * - `scope`: per-scope state explicitly grouped; see {@link ScopeContext}.
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
  // Bibliography citation labels collected during parsing
  bibcites: string[];
  // Rules (injected to avoid circular dependency)
  blockRules: BlockRule[];
  blockFallbackRule: BlockRule;
  inlineRules: InlineRule[];
  // Diagnostics collected during parsing
  diagnostics: Diagnostic[];
  // Per-scope state (readonly fields, immutable-replace semantics).
  scope: ScopeContext;
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
