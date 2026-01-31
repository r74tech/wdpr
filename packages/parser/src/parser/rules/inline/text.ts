import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Fallback rule that treats any token as text
 */
export const textRule: InlineRule = {
  name: "text",
  startTokens: ["TEXT", "WHITESPACE"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const token = currentToken(ctx);

    return {
      success: true,
      elements: [{ element: "text", data: token.value }],
      consumed: 1,
    };
  },
};

/**
 * Fallback for unrecognized tokens
 */
export const fallbackRule: InlineRule = {
  name: "fallback",
  startTokens: [], // matches anything not matched by other rules

  parse(ctx: ParseContext): RuleResult<Element> {
    const token = currentToken(ctx);

    return {
      success: true,
      elements: [{ element: "text", data: token.value }],
      consumed: 1,
    };
  },
};
