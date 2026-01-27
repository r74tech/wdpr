import type { TokenType } from "../lexer";

/**
 * Block start tokens - stop parsing paragraph when encountered at line start
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
