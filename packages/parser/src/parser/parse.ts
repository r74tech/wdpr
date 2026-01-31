import type { Token } from "../lexer";
import { tokenize } from "../lexer";
import { preprocess } from "./preprocess";
import type { Element, SyntaxTree } from "@wdprlib/ast";
import { blockRules, blockFallbackRule, inlineRules, type ParseContext } from "./rules";
import { canApplyBlockRule } from "./rules/block/utils";
import { mergeSpanStripParagraphs, cleanInternalFlags } from "./postprocess";
import { buildTableOfContents } from "./toc";

/**
 * Parser options
 */
export interface ParserOptions {
  /** Wikidot version */
  version?: "wikidot";
  /** Track position information */
  trackPositions?: boolean;
}

/**
 * Wikidot markup parser
 */
export class Parser {
  private ctx: ParseContext;

  constructor(tokens: Token[], options: ParserOptions = {}) {
    this.ctx = {
      tokens,
      pos: 0,
      version: options.version ?? "wikidot",
      trackPositions: options.trackPositions ?? true,
      // Collections for SyntaxTree output (populated during parsing)
      footnotes: [],
      tocEntries: [],
      codeBlocks: [],
      htmlBlocks: [],
      // Rules (injected to avoid circular dependency)
      blockRules,
      blockFallbackRule,
      inlineRules,
    };
  }

  /**
   * Parse tokens into SyntaxTree
   */
  parse(): SyntaxTree {
    const children: Element[] = [];

    while (!this.isAtEnd()) {
      const blocks = this.parseBlock();
      children.push(...blocks);
    }

    // Post-process: merge paragraphs that contain span_ (paragraph strip mode)
    const mergedChildren = mergeSpanStripParagraphs(children);

    // Clean internal flags from AST
    const cleanedChildren = cleanInternalFlags(mergedChildren);

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

    return result;
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
 * Parse source string into SyntaxTree
 */
export function parse(source: string, options?: ParserOptions): SyntaxTree {
  const preprocessed = preprocess(source);
  const tokens = tokenize(preprocessed, { trackPositions: options?.trackPositions });
  return new Parser(tokens, options).parse();
}
