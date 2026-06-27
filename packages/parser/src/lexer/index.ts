/**
 *
 * Lexer (tokenizer) for Wikidot markup.
 *
 * The lexer converts preprocessed wikitext into a flat sequence of tokens
 * that the parser consumes. Each token has a type (e.g., `HEADING_MARKER`,
 * `BOLD`, `TEXT`) and a string value. The lexer is context-free and does
 * not build any tree structure; that is the parser's responsibility.
 *
 * The main entry points are:
 * - `tokenize()` - convenience function that tokenizes a string in one call
 * - `Lexer` class - for more control over tokenization options
 *
 * @module
 */

export type { TokenType, Token } from "./tokens";
export { createToken } from "./tokens";
export type { LexerOptions } from "./options";
export { Lexer } from "./lexer";
export { tokenize } from "./tokenize";
