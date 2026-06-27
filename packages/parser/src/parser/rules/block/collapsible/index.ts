/**
 * Block rule for Wikidot collapsible blocks: `[[collapsible]]...[[/collapsible]]`.
 *
 * A collapsible renders as a show/hide toggle with body content that can
 * be expanded or collapsed. The opening tag accepts several attributes
 * (which may span multiple lines):
 *
 * - `show`           -- label text for the "show" link (default: "+ show block").
 * - `hide`           -- label text for the "hide" link (default: "- hide block").
 * - `folded`         -- when `"no"`, the block starts in the expanded state.
 * - `hideLocation`   -- where the toggle link appears: `"top"` (default),
 *                       `"bottom"`, `"both"`, or `"neither"`/`"none"`.
 *
 * Key Wikidot-specific behaviours:
 * - Collapsibles cannot nest. When the body parser encounters a second
 *   `[[collapsible]]`, it is treated as plain text. This is achieved by
 *   filtering the collapsible rule out of the block rule list for body parsing.
 * - Orphaned `[[/collapsible]]` tags after the matched close are consumed and
 *   emitted as `<br />` + literal text, matching Wikidot rendering.
 * - An inline form (`[[collapsible]]text[[/collapsible]]` on one line) is
 *   supported but uncommon.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { resolveToggleVisibility } from "./attributes";
import { parseCollapsibleBody } from "./body";
import { parseCollapsibleOpen } from "./open";
import { consumeOrphanedCollapsibleCloses } from "./orphans";
import { consumeCollapsibleCloseTag, isCollapsibleClose } from "./tags";

/**
 * Block rule for `[[collapsible ...]]...[[/collapsible]]`.
 *
 * Parsing strategy:
 * 1. Match BLOCK_OPEN + name "collapsible".
 * 2. Parse multiline attributes (show, hide, folded, hideLocation, etc.).
 * 3. If a NEWLINE follows the opening tag, parse body as block content
 *    with the collapsible rule itself excluded (to prevent nesting).
 *    Otherwise, parse inline content until close tag or end of line
 *    (inline form).
 * 4. Consume the `[[/collapsible]]` closing tag.
 * 5. Consume any orphaned `[[/collapsible]]` tags that follow, converting
 *    them to `<br />` + literal text.
 * 6. Derive `show-top` / `show-bottom` booleans from the `hideLocation`
 *    attribute.
 */
export const collapsibleRule: BlockRule = {
  name: "collapsible",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const openResult = parseCollapsibleOpen(ctx);
    if (!openResult) {
      return { success: false };
    }

    // Record opening tag position for diagnostics
    const openPosition = openToken.position;

    let pos = openResult.bodyStart;
    let consumed = openResult.consumed;
    const bodyResult = parseCollapsibleBody(ctx, pos, openResult.hasNewlineAfterOpen);
    consumed += bodyResult.consumed;
    pos += bodyResult.consumed;

    // Check for missing close tag
    if (!isCollapsibleClose(ctx, pos)) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/collapsible]] for [[collapsible]]",
        position: openPosition,
      });
    }

    // Consume [[/collapsible]]
    if (isCollapsibleClose(ctx, pos)) {
      const closeConsumed = consumeCollapsibleCloseTag(ctx, pos);
      consumed += closeConsumed;
      pos += closeConsumed;
    }

    const orphanedResult = consumeOrphanedCollapsibleCloses(ctx, pos);
    consumed += orphanedResult.consumed;

    const toggleVisibility = resolveToggleVisibility(openResult.attrs);

    return {
      success: true,
      elements: [
        {
          element: "collapsible",
          data: {
            elements: bodyResult.elements,
            attributes: {},
            "start-open": openResult.attrs.folded === "no",
            "show-text": openResult.attrs.show ?? null,
            "hide-text": openResult.attrs.hide ?? null,
            "show-top": toggleVisibility.showTop,
            "show-bottom": toggleVisibility.showBottom,
          },
        },
        ...orphanedResult.elements,
      ],
      consumed,
    };
  },
};
