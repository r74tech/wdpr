/**
 *
 * Parser constants that define structural boundaries in Wikidot markup.
 *
 * These constants are used by the paragraph rule to determine when a new
 * block-level construct begins, which terminates the current paragraph.
 * When any of these token types appear at the start of a line, the parser
 * stops collecting inline content for the current paragraph and begins
 * processing the new block element.
 *
 * @module
 */

import type { TokenType } from "../lexer";

/**
 * Token types that signal the start of a block-level construct in Wikidot markup.
 *
 * When the parser encounters any of these tokens at the beginning of a line while
 * building a paragraph, it stops the paragraph and delegates to the appropriate
 * block rule. Each token maps to a specific Wikidot syntax element (documented
 * inline with comments).
 */
export const BLOCK_START_TOKENS: TokenType[] = [
  "BLOCKQUOTE_MARKER",
  "LIST_BULLET",
  "LIST_NUMBER",
  "HEADING_MARKER",
  "HR_MARKER",
  "TABLE_MARKER",
  "COLON", // Definition list
  "BLOCK_OPEN", // [[footnoteblock]], [[div]], etc.
  "BLOCK_END_OPEN", // [[/div]], [[/collapsible]], etc.
  "EQUALS", // Center align (= text) or content separator (====)
  "CLEAR_FLOAT", // ~~~~
  "CLEAR_FLOAT_LEFT", // ~~~~<
  "CLEAR_FLOAT_RIGHT", // ~~~~>
];
