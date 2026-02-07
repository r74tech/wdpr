/**
 *
 * Parses the Wikidot superscript formatting syntax: `^^text^^`.
 *
 * Superscript text is delimited by double carets. The opening and
 * closing markers must appear on the same line. If no closing `^^`
 * is found before a newline, the opening marker is emitted as literal text.
 *
 * Empty superscript (`^^^^`) is silently discarded by Wikidot (produces
 * no output), matching the behavior of bold and subscript.
 *
 * Renders as a `<sup>` element in HTML.
 *
 * Produces a `"container"` AST element with `type: "superscript"`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken, hasClosingMarkerBeforeNewline } from "../types";
import { parseInlineUntil } from "./utils";

/**
 * Inline rule for parsing `^^superscript^^` formatting.
 *
 * Triggered by a `SUPER_MARKER` token (`^^`). Checks for a matching
 * closing marker on the same line, then recursively parses inline
 * content between the markers.
 *
 * When no closing marker is found, the opening `^^` is treated as
 * literal text.
 */
export const superscriptRule: InlineRule = {
  name: "superscript",
  startTokens: ["SUPER_MARKER"],

  /**
   * Attempts to parse superscript formatting at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result containing either a `"container"` element
   *          with `type: "superscript"`, an empty array (for `^^^^`), or a
   *          text fallback for unmatched markers
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const startToken = currentToken(ctx);

    // Check if closing marker exists
    if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: ctx.pos + 1 }, "SUPER_MARKER")) {
      return {
        success: true,
        elements: [{ element: "text", data: startToken.value }],
        consumed: 1,
      };
    }

    // Parse content between markers
    const result = parseInlineUntil({ ...ctx, pos: ctx.pos + 1 }, "SUPER_MARKER");

    // Empty superscript (^^^^) is ignored in Wikidot
    if (result.elements.length === 0) {
      return {
        success: true,
        elements: [],
        consumed: 1 + result.consumed + 1,
      };
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "superscript",
            attributes: {},
            elements: result.elements,
          },
        },
      ],
      consumed: 1 + result.consumed + 1,
    };
  },
};
