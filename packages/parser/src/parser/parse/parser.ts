import type { Element, PageRef, ParseResult } from "@wdprlib/ast";
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
    return parseContext(this.ctx);
  }
}

export function parseTokensWithIncludeDeferral(
  tokens: Token[],
  options: ParserOptions,
  deferInclude: (location: PageRef) => boolean,
): ParseResult {
  return parseContext(createParseContext(tokens, options, deferInclude));
}

function parseContext(ctx: ParseContext): ParseResult {
  const children: Element[] = [];

  while (!isAtEnd(ctx)) {
    children.push(...parseBlock(ctx));
  }

  return finalizeParseResult(ctx, children);
}

function isAtEnd(ctx: ParseContext): boolean {
  return ctx.pos >= ctx.tokens.length || currentToken(ctx).type === "EOF";
}

function currentToken(ctx: ParseContext): Token {
  return (
    ctx.tokens[ctx.pos] ?? {
      type: "EOF",
      value: "",
      position: {
        start: { line: 0, column: 0, offset: 0 },
        end: { line: 0, column: 0, offset: 0 },
      },
      lineStart: false,
    }
  );
}

function skipWhitespace(ctx: ParseContext): void {
  while (currentToken(ctx).type === "WHITESPACE") {
    ctx.pos++;
  }
}

function parseBlock(ctx: ParseContext): Element[] {
  return parseNextBlock(
    ctx,
    () => skipWhitespace(ctx),
    () => isAtEnd(ctx),
  );
}
