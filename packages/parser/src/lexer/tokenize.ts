import type { Token } from "./tokens";
import type { LexerOptions } from "./options";
import { Lexer } from "./lexer";

/**
 * Tokenise a Wikidot markup source string in one call.
 *
 * Shorthand for `new Lexer(source, options).tokenize()`.
 *
 * @param source - Raw Wikidot markup
 * @param options - Optional lexer configuration
 * @returns A flat array of tokens, ending with an `EOF` token
 *
 * @group Lexer
 */
export function tokenize(source: string, options?: LexerOptions): Token[] {
  return new Lexer(source, options).tokenize();
}
