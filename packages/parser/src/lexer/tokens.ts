import type { Position } from "@wdprlib/ast";

/**
 * Every distinct lexeme the Wikidot lexer can produce.
 *
 * Each value corresponds to a fixed character sequence (or class of
 * sequences) in Wikidot markup. The inline comments show the literal
 * text that produces each token type.
 *
 * @group Lexer
 */
export type TokenType =
  // Special
  | "EOF"
  | "TEXT"
  | "IDENTIFIER" // alphanumeric word
  | "NEWLINE"
  | "WHITESPACE"

  // Block delimiters
  | "BLOCK_OPEN" // [[
  | "BLOCK_CLOSE" // ]]
  | "BLOCK_END_OPEN" // [[/

  // Inline formatting
  | "BOLD_MARKER" // **
  | "ITALIC_MARKER" // //
  | "UNDERLINE_MARKER" // __
  | "STRIKE_MARKER" // --
  | "SUPER_MARKER" // ^^
  | "SUB_MARKER" // ,,
  | "MONO_MARKER" // {{
  | "MONO_CLOSE" // }}

  // Special syntax
  | "HEADING_MARKER" // + (at line start)
  | "HR_MARKER" // ---- (at line start)
  | "LIST_BULLET" // * (at line start)
  | "LIST_NUMBER" // # (at line start)
  | "BLOCKQUOTE_MARKER" // > (at line start)
  | "TABLE_MARKER" // || (at line start)
  | "TABLE_HEADER" // ||~ (header cell)
  | "TABLE_LEFT" // ||< (left align)
  | "TABLE_CENTER" // ||= (center align)
  | "TABLE_RIGHT" // ||> (right align)

  // Code blocks
  | "CODE_OPEN" // [[code]]
  | "CODE_CLOSE" // [[/code]]

  // Links
  | "LINK_OPEN" // [[[
  | "LINK_CLOSE" // ]]]
  | "BRACKET_OPEN" // [
  | "BRACKET_CLOSE" // ]
  | "BRACKET_ANCHOR" // [#
  | "BRACKET_STAR" // [*

  // Special characters
  | "PIPE" // |
  | "EQUALS" // =
  | "COLON" // :
  | "SLASH" // /
  | "STAR" // *
  | "HASH" // #
  | "AT" // @
  | "AMPERSAND" // &
  | "BACKSLASH" // \
  | "QUOTED_STRING" // "..."

  // Raw/Escape
  | "RAW_OPEN" // @@
  | "RAW_CLOSE" // @@
  | "RAW_BLOCK_OPEN" // @<
  | "RAW_BLOCK_CLOSE" // >@

  // Color
  | "COLOR_MARKER" // ##

  // Other
  | "UNDERSCORE" // _ (single underscore, for line break)
  | "BACKSLASH_BREAK" // U+E000 (preproc marker for \ at end of line)

  // Comment
  | "COMMENT_OPEN" // [!--
  | "COMMENT_CLOSE" // --]

  // Clear float
  | "CLEAR_FLOAT" // ~~~
  | "CLEAR_FLOAT_LEFT" // ~~~<
  | "CLEAR_FLOAT_RIGHT" // ~~~>

  // Double angle (guillemet)
  | "LEFT_DOUBLE_ANGLE" // <<
  | "RIGHT_DOUBLE_ANGLE"; // >> (non-line-start)

/**
 * A single lexical token produced by the {@link Lexer}.
 *
 * Tokens are the input to the parser stage. Each token carries its
 * literal text (`value`), source location (`position`), and a flag
 * indicating whether it appeared at the beginning of a line — which
 * matters because several Wikidot constructs (headings, lists,
 * blockquotes, horizontal rules) are only valid at line start.
 *
 * @group Lexer
 */
export interface Token {
  /** The lexeme category */
  type: TokenType;
  /** The literal source text that produced this token */
  value: string;
  /** Start/end location in the original source string */
  position: Position;
  /**
   * `true` when this token is the first non-whitespace token on its
   * line. Block-level rules (headings, lists, blockquotes) check this
   * flag before attempting to match.
   */
  lineStart: boolean;
}

/**
 * Construct a {@link Token} value.
 *
 * @param type - The lexeme category
 * @param value - Literal source text
 * @param position - Source location range
 * @param lineStart - Whether the token starts a new line
 * @returns A new token object
 *
 * @group Lexer
 */
export function createToken(
  type: TokenType,
  value: string,
  position: Position,
  lineStart = false,
): Token {
  return { type, value, position, lineStart };
}
