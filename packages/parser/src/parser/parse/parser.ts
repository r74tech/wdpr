import type { Element, ParseResult } from "@wdprlib/ast";
import type { Token } from "../../lexer";
import type { ParseContext } from "../rules";
import type { ParserOptions } from "./options";
import { parseNextBlock } from "./block";
import { createParseContext } from "./context";
import { finalizeParseResult } from "./result";

/**
 * Converts a token stream into a Wikidot {@link SyntaxTree}.
 *
 * The parser consumes tokens produced by the `Lexer` and emits a tree of
 * {@link Element} nodes. Block-level rules are tried in priority order; when
 * none match, the fallback paragraph rule collects inline tokens until the
 * next blank line.
 *
 * For most use-cases the standalone {@link parse} function is simpler than
 * constructing a `Parser` directly.
 *
 * @group Parser
 */
export class Parser {
  private ctx: ParseContext;

  constructor(tokens: Token[], options: ParserOptions = {}) {
    this.ctx = createParseContext(tokens, options);
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

    return finalizeParseResult(this.ctx, children);
  }

  private isAtEnd(): boolean {
    return this.ctx.pos >= this.ctx.tokens.length || this.currentToken().type === "EOF";
  }

  private currentToken(): Token {
    return this.ctx.tokens[this.ctx.pos] ?? this.eofToken();
  }

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

  private skipWhitespace(): void {
    while (this.currentToken().type === "WHITESPACE") {
      this.ctx.pos++;
    }
  }

  private parseBlock(): Element[] {
    return parseNextBlock(this.ctx, () => this.skipWhitespace(), () => this.isAtEnd());
  }
}
