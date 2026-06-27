/**
 *
 * Block rule for the explicit list syntax: `[[ul]]`/`[[ol]]` with `[[li]]` items.
 *
 * Wikidot supports two kinds of lists: the lightweight marker syntax
 * handled by `list.ts`, and the block-level syntax handled here.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseListBlock } from "./list-block";
import { isNestedListOpen } from "./tags";

/**
 * Block rule for Wikidot explicit list syntax (`[[ul]]`/`[[ol]]`).
 *
 * The entry point verifies that the BLOCK_OPEN is followed by the name
 * `"ul"` or `"ol"`, then delegates to `parseListBlock()`. On success
 * a trailing `<br />` element is appended, matching Wikidot's rendering.
 */
export const blockListRule: BlockRule = {
  name: "block-list",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const listOpen = isNestedListOpen(ctx, ctx.pos);
    if (!listOpen) {
      return { success: false };
    }

    const result = parseListBlock(ctx, ctx.pos, listOpen.type);

    if (!result) {
      return { success: false };
    }

    return {
      success: true,
      elements: [result.element, { element: "line-break" }],
      consumed: result.consumed,
    };
  },
};
