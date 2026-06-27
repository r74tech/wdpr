/**
 *
 * Block rule for the Wikidot footnote block: `[[footnoteblock]]`.
 *
 * This self-closing block tag marks the location in the page where all
 * collected footnotes (from `[[footnote]]...[[/footnote]]` inline markers)
 * should be rendered. It is analogous to a "footnotes section" placeholder.
 *
 * Optional attributes:
 * - `title` -- custom heading text for the footnotes section.
 * - `hide`  -- when `"true"` or `"yes"`, suppresses footnote rendering.
 *
 * Wikidot only honours the FIRST `[[footnoteblock]]` in a document;
 * subsequent occurrences are treated as plain text. The parser tracks
 * this via `ctx.scope.footnoteBlockParsed`, but note: that flag is per
 * spread copy of `ParseContext` (see {@link ScopeContext.footnoteBlockParsed}).
 * In practice the duplicate-rejection only fires for two top-level
 * `[[footnoteblock]]` tokens; siblings inside the same body or across
 * nested bodies both succeed today. The auto-append decision in
 * `Parser.parse` uses a post-parse AST walk, so it is unaffected.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseFootnoteBlockOpen } from "./open";

/**
 * Block rule for `[[footnoteblock]]`.
 *
 * Parsing strategy:
 * 1. Match BLOCK_OPEN + name "footnoteblock" (case-insensitive).
 * 2. Parse optional attributes (`title`, `hide`) with the rule-local parser.
 * 3. Consume closing `]]`.
 * 4. If `ctx.scope.footnoteBlockParsed` is already `true` on the current
 *    `ParseContext` copy, fail. Because `parseBlocksUntil` spreads a
 *    fresh `ctx` per sibling rule, this only rejects a second
 *    `[[footnoteblock]]` that arrives via the parser's top-level
 *    dispatch loop in practice. See {@link ScopeContext.footnoteBlockParsed}.
 * 5. Replace `ctx.scope` with the flag set to `true` and emit a `footnote-block`
 *    element.
 */
export const footnoteBlockRule: BlockRule = {
  name: "footnoteBlock",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const openResult = parseFootnoteBlockOpen(ctx, ctx.pos);
    if (!openResult) {
      return { success: false };
    }

    if (ctx.scope.footnoteBlockParsed) {
      return { success: false };
    }
    ctx.scope = { ...ctx.scope, footnoteBlockParsed: true };

    const title = openResult.attrs.title !== undefined ? openResult.attrs.title : null;
    const hide = openResult.attrs.hide === "true" || openResult.attrs.hide === "yes";

    return {
      success: true,
      elements: [
        {
          element: "footnote-block",
          data: {
            title,
            hide,
          },
        },
      ],
      consumed: openResult.consumed,
    };
  },
};
