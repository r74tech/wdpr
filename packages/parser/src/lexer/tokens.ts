import type { Position } from "@wdpr/ast";

/**
 * Token types for Wikidot markup
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
 * Token
 */
export interface Token {
  type: TokenType;
  value: string;
  position: Position;
  /** Whether this token appears at the start of a line */
  lineStart: boolean;
}

/**
 * Create a token
 */
export function createToken(
  type: TokenType,
  value: string,
  position: Position,
  lineStart = false,
): Token {
  return { type, value, position, lineStart };
}
