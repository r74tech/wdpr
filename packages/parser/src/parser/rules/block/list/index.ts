/**
 *
 * Block rule for Wikidot marker-based lists (`* item`, `# item`).
 *
 * Wikidot lists use leading `*` (bullet) or `#` (numbered) markers at the
 * start of a line. Nesting is achieved by prepending spaces:
 *
 * ```
 * * Item 1
 *  * Nested bullet
 *  # Nested numbered
 * * Item 2
 * ```
 *
 * The depth of each item is determined by the number of leading spaces
 * before the marker. Mixed bullet/numbered lists are supported: when the
 * list type changes at the same depth, a new sub-list is created.
 *
 * The flat depth-annotated items are converted into a recursive tree by
 * `processDepths()`, then transformed into nested `list` AST elements
 * by `buildListElement()`.
 *
 * Maximum nesting depth is capped at `MAX_LIST_DEPTH` (20).
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { buildNativeListElements, collectNativeListLines } from "./native";

/**
 * Block rule for marker-based lists (`* ` bullet, `# ` numbered).
 *
 * Parsing strategy:
 * 1. Verify the first token is LIST_BULLET or LIST_NUMBER at line start.
 * 2. Collect consecutive list lines, recording each item's depth (number
 *    of leading spaces), type (bullet/numbered), and inline content.
 * 3. Feed the flat depth array into `processDepths()` with type
 *    comparison, producing a nested tree.
 * 4. Convert the tree into `list` AST elements via `buildListElement()`.
 */
export const listRule: BlockRule = {
  name: "list",
  startTokens: ["LIST_BULLET", "LIST_NUMBER"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const firstToken = currentToken(ctx);

    if (!firstToken.lineStart) {
      return { success: false };
    }

    // Wikidot: list must start with list marker directly (no leading whitespace)
    if (firstToken.type !== "LIST_BULLET" && firstToken.type !== "LIST_NUMBER") {
      return { success: false };
    }

    const nativeList = collectNativeListLines(ctx);

    // No items parsed - rule fails
    if (nativeList.lines.length === 0) {
      return { success: false };
    }

    return {
      success: true,
      elements: buildNativeListElements(nativeList.lines),
      consumed: nativeList.consumed,
    };
  },
};
