/**
 *
 * Parses the Wikidot italic formatting syntax: `//text//`.
 *
 * Italic text is delimited by double forward slashes. The opening and
 * closing markers must appear on the same line. If no closing `//` is
 * found before a newline, the opening marker is emitted as literal text.
 *
 * Unlike bold (which discards empty markers), italic markers with empty
 * content (`////`) still produce an italic container, matching Wikidot's
 * behavior.
 *
 * Italic may nest other inline formatting within its body.
 *
 * Produces a `"container"` AST element with `type: "italics"`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken, hasClosingMarkerBeforeNewline } from "../types";
import { parseInlineUntil } from "./utils";

/**
 * Inline rule for parsing `//italic//` formatting.
 *
 * Triggered by an `ITALIC_MARKER` token (`//`). Checks for a matching
 * closing marker on the same line, then recursively parses inline content.
 *
 * When no closing marker is found, the opening `//` is treated as
 * literal text.
 */
export const italicRule: InlineRule = {
  name: "italic",
  startTokens: ["ITALIC_MARKER"],

  /**
   * Attempts to parse italic formatting at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result containing either a `"container"` element
   *          with `type: "italics"`, or a text fallback for unmatched markers
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const startToken = currentToken(ctx);

    // Check if closing marker exists
    if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: ctx.pos + 1 }, "ITALIC_MARKER")) {
      return {
        success: true,
        elements: [{ element: "text", data: startToken.value }],
        consumed: 1,
      };
    }

    // Parse content between markers
    const result = parseInlineUntil({ ...ctx, pos: ctx.pos + 1 }, "ITALIC_MARKER");

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "italics",
            attributes: {},
            elements: result.elements,
          },
        },
      ],
      consumed: 1 + result.consumed + 1, // open + content + close
    };
  },
};
