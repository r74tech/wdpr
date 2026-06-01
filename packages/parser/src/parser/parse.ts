import type { Token } from "../lexer";
import { tokenize } from "../lexer";
import { preprocess } from "./preprocess";
import type { Element, SyntaxTree, WikitextSettings, ParseResult } from "@wdprlib/ast";
import { DEFAULT_SETTINGS } from "@wdprlib/ast";
import { blockRules, blockFallbackRule, inlineRules, type ParseContext } from "./rules";
import { canApplyBlockRule } from "./rules/block/utils";
import {
  mergeSpanStripParagraphs,
  cleanInternalFlags,
  suppressDivAdjacentParagraphs,
} from "./postprocess";
import { buildTableOfContents } from "./toc";

/**
 * Configuration for the {@link Parser} and the {@link parse} function.
 *
 * All fields are optional; sensible defaults are applied when omitted.
 *
 * @group Parser
 */
export interface ParserOptions {
  /** Markup dialect. Currently only `"wikidot"` is supported. */
  version?: "wikidot";
  /**
   * Propagate source-position data into every AST node.
   * Defaults to `true`. Set to `false` for smaller output when positions
   * are not needed.
   */
  trackPositions?: boolean;
  /**
   * Context-dependent feature flags (page vs. forum-post, etc.).
   * Defaults to {@link DEFAULT_SETTINGS} (full page mode).
   */
  settings?: WikitextSettings;
}

/**
 * Converts a token stream into a Wikidot {@link SyntaxTree}.
 *
 * The parser consumes tokens produced by the `Lexer` and emits a
 * tree of {@link Element} nodes. Block-level rules are tried in priority
 * order; when none match, the fallback paragraph rule collects inline
 * tokens until the next blank line.
 *
 * After the main parse pass, two post-processing steps run:
 *
 * 1. **Span-strip merging** — `[[span_]]` elements that set
 *    `_paragraphStrip` are merged with adjacent paragraphs.
 * 2. **Internal-flag cleanup** — all `_`-prefixed bookkeeping fields
 *    are removed from the final AST.
 *
 * For most use-cases the standalone {@link parse} function is simpler
 * than constructing a `Parser` directly.
 *
 * @group Parser
 */
export class Parser {
  private ctx: ParseContext;

  constructor(tokens: Token[], options: ParserOptions = {}) {
    this.ctx = {
      tokens,
      pos: 0,
      version: options.version ?? "wikidot",
      trackPositions: options.trackPositions ?? true,
      settings: options.settings ?? DEFAULT_SETTINGS,
      // Collections for SyntaxTree output (populated during parsing)
      footnotes: [],
      tocEntries: [],
      codeBlocks: [],
      htmlBlocks: [],
      // State flags
      footnoteBlockParsed: false,
      bibcites: [],
      // Diagnostics
      diagnostics: [],
      // Rules (injected to avoid circular dependency)
      blockRules,
      blockFallbackRule,
      inlineRules,
    };
  }

  /**
   * Parse tokens into a {@link ParseResult} containing the AST and
   * any diagnostics emitted during parsing.
   *
   * @since 2.0.0
   */
  parse(): ParseResult {
    const children: Element[] = [];

    while (!this.isAtEnd()) {
      const blocks = this.parseBlock();
      children.push(...blocks);
    }

    // Post-process: merge paragraphs that contain span_ (paragraph strip mode)
    const mergedChildren = mergeSpanStripParagraphs(children);

    // Wikidot: paragraphs directly adjacent to div blocks lose <p> wrapping
    const divProcessed = suppressDivAdjacentParagraphs(mergedChildren);

    // Clean internal flags from AST
    const cleanedChildren = cleanInternalFlags(divProcessed);

    // Add footnote-block at the end if not present
    const hasFootnoteBlock = cleanedChildren.some((el) => el.element === "footnote-block");
    if (!hasFootnoteBlock) {
      cleanedChildren.push({
        element: "footnote-block",
        data: { title: null, hide: false },
      });
    }

    // Build table of contents from collected entries
    const tableOfContents = buildTableOfContents(this.ctx.tocEntries);

    // Build result, omitting empty optional fields
    const result: SyntaxTree = {
      elements: cleanedChildren,
    };

    if (tableOfContents.length > 0) {
      result["table-of-contents"] = tableOfContents;
    }

    if (this.ctx.footnotes.length > 0) {
      result.footnotes = this.ctx.footnotes;
    }

    if (this.ctx.codeBlocks.length > 0) {
      result["code-blocks"] = this.ctx.codeBlocks;
    }

    if (this.ctx.htmlBlocks.length > 0) {
      result["html-blocks"] = this.ctx.htmlBlocks;
    }

    return { ast: result, diagnostics: this.ctx.diagnostics };
  }

  /**
   * Check if at end of tokens
   */
  private isAtEnd(): boolean {
    return this.ctx.pos >= this.ctx.tokens.length || this.currentToken().type === "EOF";
  }

  /**
   * Get current token
   */
  private currentToken(): Token {
    return this.ctx.tokens[this.ctx.pos] ?? this.eofToken();
  }

  /**
   * Create EOF token
   */
  private eofToken(): Token {
    return {
      type: "EOF",
      value: "",
      position: {
        start: { line: 0, column: 0, offset: 0 },
        end: { line: 0, column: 0, offset: 0 },
      },
      lineStart: false,
    };
  }

  /**
   * Skip whitespace tokens
   */
  private skipWhitespace(): void {
    while (this.currentToken().type === "WHITESPACE") {
      this.ctx.pos++;
    }
  }

  /**
   * Parse block element(s)
   * Returns an array because some rules (like list) may return multiple elements
   */
  private parseBlock(): Element[] {
    this.skipWhitespace();

    if (this.isAtEnd()) {
      return [];
    }

    const token = this.currentToken();

    // Skip empty lines
    if (token.type === "NEWLINE") {
      this.ctx.pos++;
      return [];
    }

    // Try each block rule
    for (const rule of this.ctx.blockRules) {
      if (canApplyBlockRule(rule, token)) {
        const result = rule.parse(this.ctx);
        if (result.success) {
          this.ctx.pos += result.consumed;
          return result.elements;
        }
      }
    }

    // Fallback to paragraph
    const result = this.ctx.blockFallbackRule.parse(this.ctx);
    if (result.success && result.elements.length > 0) {
      this.ctx.pos += result.consumed;
      return result.elements;
    }

    // Should never reach here, but skip token to avoid infinite loop
    this.ctx.pos++;
    return [];
  }
}

/**
 * Parse a Wikidot markup string into an AST with diagnostics.
 *
 * @example
 * ```ts
 * import { parse } from "@wdprlib/parser";
 *
 * const { ast, diagnostics } = parse("**bold** and //italic//");
 * ```
 *
 * @since 2.0.0
 */
export function parse(source: string, options?: ParserOptions): ParseResult {
  const preprocessed = preprocess(source);
  const tokens = tokenize(preprocessed, { trackPositions: options?.trackPositions });
  return new Parser(tokens, options).parse();
}
