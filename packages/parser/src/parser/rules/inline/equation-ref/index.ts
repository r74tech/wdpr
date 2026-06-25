/**
 *
 * Parses the Wikidot equation reference syntax: `[[eref name]]`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { equationReferenceElement } from "./element";
import { parseEquationRefName } from "./syntax";

export const equationRefRule: InlineRule = {
  name: "equation-ref",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const parsed = parseEquationRefName(ctx, ctx.pos + 1);
    if (!parsed) {
      return { success: false };
    }

    return {
      success: true,
      elements: [equationReferenceElement(parsed.name)],
      consumed: 1 + parsed.consumed,
    };
  },
};
