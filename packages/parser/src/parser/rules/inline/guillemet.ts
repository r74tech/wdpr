import type { Element } from "@wdpr/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";

/**
 * Guillemet rule - converts << and >> to typographic quotes
 * << → « (LEFT-POINTING DOUBLE ANGLE QUOTATION MARK, U+00AB)
 * >> → » (RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK, U+00BB)
 */
export const guillemetRule: InlineRule = {
  name: "guillemet",
  startTokens: ["LEFT_DOUBLE_ANGLE", "RIGHT_DOUBLE_ANGLE"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const token = ctx.tokens[ctx.pos];

    // << → «
    if (token?.type === "LEFT_DOUBLE_ANGLE") {
      return {
        success: true,
        elements: [{ element: "text", data: "\u00AB" }],
        consumed: 1,
      };
    }

    // >> → »
    if (token?.type === "RIGHT_DOUBLE_ANGLE") {
      return {
        success: true,
        elements: [{ element: "text", data: "\u00BB" }],
        consumed: 1,
      };
    }

    return { success: false };
  },
};
