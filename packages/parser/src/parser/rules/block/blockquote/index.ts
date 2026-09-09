/**
 *
 * Block rule for Wikidot-style blockquotes using `>` markers.
 *
 * Wikidot blockquotes are written with one or more `>` characters at the
 * start of a line, followed by a mandatory space and then the content:
 *
 * ```
 * > First level
 * >> Second level
 * > Back to first
 * ```
 *
 * Key behaviours:
 * - The depth is determined by the number of consecutive `>` characters.
 * - A space after the `>` markers is required; lines like `>No space` are
 *   consumed but silently discarded from output.
 * - An empty line (just `> `) within the same depth acts as a paragraph
 *   separator inside the blockquote.
 * - Nesting is handled by the generic {@link processDepths} utility, which
 *   converts flat depth-annotated rows into a recursive tree structure.
 * - Maximum depth is capped at `MAX_BLOCKQUOTE_DEPTH` (30) to guard
 *   against pathological input.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { buildBlockquoteElements, collectBlockquoteLines } from "./lines";

/**
 * Block rule for `>` prefix blockquotes.
 *
 * Parsing strategy:
 * 1. Collect consecutive lines that begin with BLOCKQUOTE_MARKER at line start.
 * 2. For each line, record the depth (number of `>` chars, zero-indexed)
 *    and the token range of the content after the mandatory space.
 * 3. Lines missing the required space are consumed but produce no output.
 * 4. Feed the flat depth list into {@link processDepths} to build a nested tree.
 * 5. Recursively convert the tree into nested blockquote container elements,
 *    re-parsing each run of content tokens as blocks.
 */
export const blockquoteRule: BlockRule = {
  name: "blockquote",
  startTokens: ["BLOCKQUOTE_MARKER"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const firstToken = currentToken(ctx);

    if (!firstToken.lineStart) {
      return { success: false };
    }

    const blockquoteLines = collectBlockquoteLines(ctx);

    // No rows parsed
    if (blockquoteLines.lines.length === 0) {
      // If we consumed tokens (e.g. lines without space after >), return empty success
      if (blockquoteLines.consumed > 0) {
        return { success: true, elements: [], consumed: blockquoteLines.consumed };
      }
      return { success: false };
    }

    const blockquotes = buildBlockquoteElements(ctx, blockquoteLines.lines);

    if (blockquotes.length === 0) {
      return { success: true, elements: [], consumed: blockquoteLines.consumed };
    }

    return {
      success: true,
      elements: blockquotes,
      consumed: blockquoteLines.consumed,
    };
  },
};
