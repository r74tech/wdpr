/**
 *
 * Main parser for Wikidot markup.
 *
 * The parser consumes a token stream from the lexer and produces an AST
 * (Abstract Syntax Tree) conforming to the `@wdprlib/ast` package types.
 * It applies block rules and inline rules in a recursive-descent fashion,
 * followed by post-processing passes for paragraph merging and cleanup.
 *
 * The main entry points are:
 * - `parse()` - convenience function that parses a string in one call
 * - `Parser` class - for more control over parsing options
 *
 * @module
 */

export type { ParserOptions } from "./parse";
export { Parser, parse } from "./parse";
