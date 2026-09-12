import type { Token, TokenType } from "./tokens";
import type { LexerOptions } from "./options";
import {
  createLexerToken,
  nextBlockOpenerDepth,
  updateLastNonWhitespaceType,
} from "./token-factory";
import {
  advance,
  advanceByToken,
  createInitialLexerState,
  current,
  isAtEnd,
  isSyntaxLineStart,
  type LexerState,
} from "./state";
import { findInvalidAnchorNameEnd } from "./anchor";
import { scanQuotedString } from "./quoted-string";
import { scanSimpleSyntaxToken } from "./syntax-actions";
import type { TokenAction } from "./token-actions";
import { scanPunctuationToken } from "./punctuation";
import { scanCompactTextToken, scanTextToken } from "./text-actions";
import { limitBlockquotePrefixSpace, scanSpacingToken } from "./spacing-actions";

/**
 * Converts a Wikidot markup source string into a flat array of {@link Token}s.
 *
 * The lexer is single-pass and greedy: it tries the longest-matching
 * multi-character pattern first (e.g. `[[[` before `[[`, `**` before `*`).
 * Context-sensitive constructs (line-start headings, blockquote markers)
 * are disambiguated via the `lineStart` state flag.
 *
 * For convenience, use the standalone {@link tokenize} function instead
 * of constructing a `Lexer` directly.
 *
 * @group Lexer
 */
export class Lexer {
  private state: LexerState;
  private options: Required<LexerOptions>;
  // Positions where ]] should be split into ] + ] (for invalid anchor names)
  private splitBlockClosePositions: Set<number> = new Set();
  private lastNonWhitespaceType: TokenType | null = null;
  /**
   * Nesting depth of block-opener context (between `[[` / `[[/` and the
   * matching `]]`). Used to scope `QUOTED_STRING` recognition so that
   * `"` after `=` only becomes a quoted attribute value while we are
   * actually parsing block attributes — otherwise inline `=` followed by
   * `"` (e.g. inside `[[footnote]]="[[/footnote]]`) would erroneously
   * consume content up to the next `"` or newline.
   */
  private blockOpenerDepth = 0;
  private rawTagBounds: { source: string; close: number; outerDepth: number } | null = null;
  private rawClosesExhausted = false;

  constructor(source: string, options: LexerOptions = {}) {
    this.options = {
      trackPositions: options.trackPositions ?? true,
      compactTextRuns: options.compactTextRuns ?? false,
    };
    this.state = createInitialLexerState(source);
  }

  /**
   * Tokenize the entire source
   */
  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.addToken("EOF", "");
    return this.state.tokens;
  }

  /**
   * Check if at end of source
   */
  private isAtEnd(): boolean {
    return isAtEnd(this.state);
  }

  /**
   * Get current character
   */
  private current(): string {
    return current(this.state);
  }

  /**
   * Check if [[# is followed by an invalid anchor name that closes with ]].
   * Valid: [[# valid-name]] where name matches [-_A-Za-z0-9.%]+
   * Invalid: [[# name with spaces]] or [[# name$special]]
   * When invalid, returns the position of the closing ]] so the lexer can
   * emit tokens that allow the inner [# text] to be parsed as a described link.
   */
  private findInvalidAnchorNameEnd(source: string): number | null {
    return findInvalidAnchorNameEnd(source, this.state.pos);
  }

  /**
   * Advance position by n characters
   */
  private advance(n = 1): string {
    return advance(this.state, n);
  }

  /**
   * Returns the type of the last non-whitespace token, or null if none.
   */
  private lastNonWhitespaceTokenType(): TokenType | null {
    return this.lastNonWhitespaceType;
  }

  /**
   * Add token
   */
  private addToken(type: TokenType, value: string): void {
    this.state.tokens.push(createLexerToken(this.state, type, value, this.options.trackPositions));
    this.lastNonWhitespaceType = updateLastNonWhitespaceType(this.lastNonWhitespaceType, type);
    this.blockOpenerDepth = nextBlockOpenerDepth(this.blockOpenerDepth, type);
    if (
      this.rawTagBounds === null &&
      !this.rawClosesExhausted &&
      value.toLowerCase() === "button" &&
      this.state.tokens.at(-2)?.type === "BLOCK_OPEN" &&
      /\s/.test(this.current())
    ) {
      const close = this.state.source.indexOf("]]", this.state.pos);
      if (close < 0) {
        this.rawClosesExhausted = true;
      } else {
        this.rawTagBounds = {
          source: this.state.source.slice(0, close),
          close,
          outerDepth: this.blockOpenerDepth - 1,
        };
      }
    }
  }

  private emitTokenAction(action: TokenAction): void {
    advanceByToken(this.state, action.type, action.length, action.value);
    this.addToken(action.type, action.value);
  }

  private emitTokenActions(actions: TokenAction | TokenAction[]): void {
    if (Array.isArray(actions)) {
      for (const action of actions) {
        this.emitTokenAction(action);
      }
      return;
    }
    this.emitTokenAction(actions);
  }

  /**
   * Scan a single token
   */
  private scanToken(): void {
    const char = this.current();
    const isLineStart = isSyntaxLineStart(this.state);
    const bounds = this.rawTagBounds;
    const src = bounds?.source ?? this.state.source;

    // Scanners see a bounded source so no token can consume part of the close.
    if (bounds && this.state.pos === bounds.close) {
      this.emitTokenAction({ type: "BLOCK_CLOSE", value: "]]", length: 2 });
      this.blockOpenerDepth = bounds.outerDepth;
      this.rawTagBounds = null;
      return;
    }

    const spacingAction = scanSpacingToken(src, this.state.pos);
    if (spacingAction) {
      this.emitTokenAction(limitBlockquotePrefixSpace(spacingAction, this.state.tokens.at(-1)));
      return;
    }

    const punctuation = scanPunctuationToken({
      char,
      source: src,
      pos: this.state.pos,
      lineStart: isLineStart,
      physicalLineStart: this.state.lineStart,
      splitBlockClose: this.splitBlockClosePositions.has(this.state.pos),
      findInvalidAnchorNameEnd: () => this.findInvalidAnchorNameEnd(src),
    });
    if (punctuation.handled) {
      if (punctuation.clearSplitBlockCloseAt !== undefined) {
        this.splitBlockClosePositions.delete(punctuation.clearSplitBlockCloseAt);
      }
      if (punctuation.splitBlockCloseAt !== undefined) {
        this.splitBlockClosePositions.add(punctuation.splitBlockCloseAt);
      }
      this.emitTokenActions(punctuation.actions);
      return;
    }

    // Quoted string (only after EQUALS for block attribute values)
    // In inline context (outside of a `[[...]]` opener), `"` is just a
    // text character (typographic quote). Without the depth gate, an
    // inline `=` followed by `"` (e.g. `[[footnote]]="[[/footnote]]`)
    // would otherwise eat the closing tag.
    if (char === '"') {
      const lastNonWs = this.lastNonWhitespaceTokenType();
      if (this.blockOpenerDepth > 0 && lastNonWs === "EQUALS") {
        this.addToken("QUOTED_STRING", scanQuotedString(this.state, src.length));
        return;
      }
      this.advance();
      this.addToken("TEXT", '"');
      return;
    }

    const simpleAction = scanSimpleSyntaxToken(src, this.state.pos, isLineStart);
    if (simpleAction) {
      this.emitTokenAction(simpleAction);
      return;
    }

    if (this.options.compactTextRuns && this.blockOpenerDepth === 0) {
      const compactTextAction = scanCompactTextToken(src, this.state.pos);
      if (compactTextAction) {
        this.emitTokenAction(compactTextAction);
        return;
      }
    }

    this.emitTokenAction(scanTextToken(src, this.state.pos));
  }
}
