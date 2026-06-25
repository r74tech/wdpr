/**
 *
 * Parses the Wikidot inline math syntax: `[[$ LaTeX $]]`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseInlineMathSource } from "./syntax";

export const mathInlineRule: InlineRule = {
  name: "math-inline",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const parsed = parseInlineMathSource(ctx, ctx.pos + 1);
    if (!parsed) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "math-inline",
          data: {
            "latex-source": parsed.latexSource,
          },
        },
      ],
      consumed: 1 + parsed.consumed,
    };
  },
};
