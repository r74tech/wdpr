/**
 *
 * Parses the Wikidot monospace (teletype) formatting syntax: `{{text}}`.
 *
 * Monospace text is delimited by double curly braces. The opening and
 * closing markers must appear on the same line. If no closing `}}`
 * is found before a newline, the opening marker is emitted as literal text.
 *
 * Note: the opening marker is `MONO_MARKER` (`{{`) and the closing marker
 * is `MONO_CLOSE` (`}}`). These are distinct token types because `{` and
 * `}` have different lexer significance in some contexts.
 *
 * Monospace is a "container" element, meaning it can nest other inline
 * formatting within its body. It renders as a `<tt>` element in HTML.
 *
 * Wikidot syntax: `{{monospace text}}`
 *
 * Produces a `"container"` AST element with `type: "monospace"`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken, hasClosingMarkerBeforeNewline } from "../types";
import { parseInlineUntil } from "./utils";

/**
 * Inline rule for parsing `{{monospace}}` formatting.
 *
 * Triggered by a `MONO_MARKER` token (`{{`). Checks for a matching
 * `MONO_CLOSE` (`}}`) on the same line, then recursively parses
 * inline content between the markers.
 *
 * When no closing marker is found, the opening `{{` is treated as
 * literal text.
 */
export const monospaceRule: InlineRule = {
  name: "monospace",
  startTokens: ["MONO_MARKER"],

  /**
   * Attempts to parse monospace formatting at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result containing either a `"container"` element
   *          with `type: "monospace"`, or a text fallback for unmatched markers
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const startToken = currentToken(ctx);

    // Check if closing marker exists
    if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: ctx.pos + 1 }, "MONO_CLOSE")) {
      return {
        success: true,
        elements: [{ element: "text", data: startToken.value }],
        consumed: 1,
      };
    }

    // Parse content between markers
    const result = parseInlineUntil({ ...ctx, pos: ctx.pos + 1 }, "MONO_CLOSE");

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "monospace",
            attributes: {},
            elements: result.elements,
          },
        },
      ],
      consumed: 1 + result.consumed + 1, // open + content + close
    };
  },
};
