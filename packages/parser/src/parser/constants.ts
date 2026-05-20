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

/**
 * Set of block names recognized by the parser at `[[name]]` / `[[/name]]`.
 *
 * Used by inline-parser logic to distinguish real block boundaries from
 * unknown tokens like `[[foo]]`, which Wikidot treats as inline text
 * rather than as a paragraph-breaking block.
 *
 * Keep in sync with the set of block rules registered in
 * `packages/parser/src/parser/rules/block/index.ts`. Align-style markers
 * (`<`, `>`, `=`, `==`) are intentionally included because `[[<]]` etc.
 * open `alignRule`.
 */
export const KNOWN_BLOCK_NAMES: ReadonlySet<string> = new Set<string>([
  // structural containers
  "collapsible",
  "div",
  "div_",
  "code",
  // list blocks
  "ul",
  "ol",
  "li",
  // table blocks
  "table",
  "row",
  "cell",
  "hcell",
  // tabview / module
  "tabview",
  "tabs",
  "module",
  "module654",
  // misc named blocks
  "bibliography",
  "footnoteblock",
  "toc",
  "iframe",
  "math",
  "html",
  "iftags",
  "include",
  "f", // float TOC prefix: `[[f<toc]]`, `[[f>toc]]` (see toc rule)
  // embed family
  "embed",
  "embedvideo",
  "embedaudio",
  // align markers
  "<",
  ">",
  "=",
  "==",
  // inline-level constructs that use BLOCK_OPEN tokens; recognized here so
  // that the paragraph parser keeps existing block-boundary behavior for
  // `[[span]]`, `[[user ...]]`, `[[$ ... $]]`, etc. when they appear at
  // the start of a line.
  "span",
  "span_",
  "user",
  "a",
  "anchor",
  "size",
  "footnote",
  "eref",
  "$",
  "image",
  "gallery",
  "file",
]);
