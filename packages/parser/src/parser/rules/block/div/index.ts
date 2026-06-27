/**
 *
 * Block rule for Wikidot `[[div]]` and `[[div_]]` container blocks.
 *
 * `[[div]]` wraps its body content in a `<div>` element, with full
 * paragraph processing for the body. `[[div_]]` (paragraph strip mode)
 * unwraps the first and last paragraphs so their content appears directly
 * inside the `<div>`, while middle paragraphs keep their `<p>` wrappers.
 *
 * Both variants accept HTML attributes (class, style, id, etc.) on the
 * opening tag.
 *
 * Wikidot-specific edge cases:
 * - The opening `]]` MUST be followed by a NEWLINE for the block to be
 *   recognised. `[[div]]inline[[/div]]` is NOT a valid div -- it becomes
 *   a failed div (see `consumeFailedDiv()`).
 * - When a div fails, everything from the opening `[[div]]` through the
 *   last `[[/div]]` is collected as a single paragraph of text/line-break
 *   elements. Blank lines within that span are silently removed.
 * - `[[div_]]` uses `unwrapEdgeParagraphs()` to strip paragraph
 *   wrappers from the first and last elements.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseDivBody } from "./body";
import { consumeDivClose } from "./close";
import { consumeFailedDiv } from "./failed";
import { parseDivOpen } from "./open";

/**
 * Block rule for `[[div]]`/`[[div_]]` container blocks.
 *
 * `requiresLineStart` is `false` because nested `[[div_]]` inside another
 * `[[div_]]` may appear after inline content.
 */
export const divRule: BlockRule = {
  name: "div",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false, // Allow nested [[div_]] inside [[div_]]

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const openResult = parseDivOpen(ctx);
    if (!openResult) {
      return { success: false };
    }

    // Wikidot: [[div]] must be followed by newline to be recognized as block
    // [[div]]inline[[/div]] is NOT recognized as div
    // When this fails, Wikidot consumes everything up to the last [[/div]]
    // as text in a single paragraph (blank lines are ignored)
    if (!openResult.hasRequiredNewline) {
      return consumeFailedDiv(ctx);
    }

    // Wikidot matches [[div]]/[[/div]] pairs from outside-in. When there are
    // more opens than closes, the innermost excess opens become text. We enforce
    // this with a "closes budget": the number of additional nested divs that can
    // open. When budget reaches 0, this div cannot open.
    if (ctx.scope.divClosesBudget === 0) {
      return { success: false };
    }

    // Record opening tag position for diagnostics
    const openPosition = openToken.position;

    let pos = openResult.bodyStart;
    let consumed = openResult.consumed;
    const bodyResult = parseDivBody(ctx, pos, openResult.paragraphStrip);
    consumed += bodyResult.consumed;
    pos += bodyResult.consumed;

    // Check for missing close tag
    if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: `Missing closing tag [[/div]] for [[${openResult.blockName}]]`,
        position: openPosition,
      });
    }

    // Consume [[/div]]
    if (ctx.tokens[pos]?.type === "BLOCK_END_OPEN") {
      const closeResult = consumeDivClose(ctx, pos);
      pos = closeResult.pos;
      consumed += closeResult.consumed;
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "div",
            attributes: openResult.attributes,
            elements: bodyResult.elements,
          },
        },
      ],
      consumed,
    };
  },
};
