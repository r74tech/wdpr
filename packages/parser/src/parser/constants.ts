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

export const BLOCK_START_TOKEN_SET: ReadonlySet<TokenType> = new Set(BLOCK_START_TOKENS);

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

/**
 * Block names whose rule sets `requiresLineStart: false`, i.e. they can
 * legitimately start a block even when the `[[...]]` opener is preceded
 * by leading whitespace on its line.
 *
 * Used by the inline parser to decide whether a `\n<indent>[[name]]`
 * sequence ends the current paragraph. Without this list, the inline
 * parser would either:
 *   - keep `lineStart` strict and miss legitimately-indented container
 *     blocks (Wikidot accepts e.g. `\n     [[div_]]`); the inner block
 *     gets absorbed into the parent paragraph as literal text, or
 *   - drop the `lineStart` check entirely and prematurely break out of
 *     paragraphs for `\n  [[toc]]` — a rule with `requiresLineStart: true`
 *     would refuse the indented token, leaving the paragraph split but
 *     the block unconsumed (literal `[[toc]]` text in a new paragraph).
 *
 * Each entry corresponds to a name handled by a block rule whose
 * `requiresLineStart` is `false`. Keep this list in sync when adding or
 * changing such rules; the inline-level constructs that happen to share
 * `BLOCK_OPEN` (`[[span]]`, `[[image]]`, `[[user]]`, etc.) are
 * intentionally excluded — they remain inline and should not split
 * paragraphs based on indentation alone.
 *
 * Sources (block rule → handled names):
 * - `bibliographyRule` → bibliography
 * - `blockListRule` → ul, ol, li
 * - `codeRule` → code
 * - `collapsibleRule` → collapsible
 * - `divRule` → div, div_
 * - `embedBlockRule` → embed, embedvideo, embedaudio
 * - `htmlRule` → html
 * - `iframeRule` → iframe
 * - `iftagsRule` → iftags
 * - `mathRule` → math
 * - `moduleRule` → module, module654
 * - `orphanLiRule` → li (also under blockListRule)
 * - `tableBlockRule` → table (row, cell, hcell are private to the in-table
 *   parser, never accepted by the top-level dispatcher)
 * - `tabviewRule` → tabview, tabs (tab is private to the in-tabview parser)
 *
 * `includeRule` is omitted because `[[include ...]]` is expanded as a
 * text-level macro by `resolveIncludes` before the parser sees it.
 */
export const INDENT_ACCEPTING_BLOCK_NAMES: ReadonlySet<string> = new Set<string>([
  "bibliography",
  "ul",
  "ol",
  "li",
  "code",
  "collapsible",
  "div",
  "div_",
  "embed",
  "embedvideo",
  "embedaudio",
  "html",
  "iframe",
  "iftags",
  "math",
  "module",
  "module654",
  "table",
  "tabview",
  "tabs",
]);
