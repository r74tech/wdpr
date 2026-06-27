/**
 *
 * Block rule for Wikidot horizontal rules: `----` (four or more hyphens
 * at the start of a line).
 *
 * The lexer emits an HR_MARKER token for sequences of four or more `-`
 * characters at line start. This rule consumes the marker, any remaining
 * tokens on the line, and an optional trailing newline, producing a single
 * `horizontal-rule` element (rendered as `<hr />`).
 *
 * Any text after the `----` on the same line is silently discarded,
 * matching Wikidot's behaviour.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { consumeHorizontalRuleLine } from "./syntax";

/**
 * Block rule for horizontal rules (`----`).
 *
 * Produces a `horizontal-rule` element with no data payload.
 */
export const horizontalRuleRule: BlockRule = {
  name: "horizontalRule",
  startTokens: ["HR_MARKER"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const marker = currentToken(ctx);

    if (!marker.lineStart) {
      return { success: false };
    }

    return {
      success: true,
      elements: [{ element: "horizontal-rule" }],
      consumed: consumeHorizontalRuleLine(ctx),
    };
  },
};
