import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "../utils";

/**
 * Equation reference: [[eref name]]
 * Note: [[equation name]] is NOT supported in Wikidot - it's rendered as plain text
 */
export const equationRefRule: InlineRule = {
  name: "equation-ref",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult) {
      return { success: false };
    }

    const blockName = nameResult.name.toLowerCase();
    // Only "eref" is supported in Wikidot
    if (blockName !== "eref") {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse reference name
    let refName = "";
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "BLOCK_CLOSE" || token.type === "NEWLINE") {
        break;
      }
      refName += token.value;
      pos++;
      consumed++;
    }

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    refName = refName.trim();

    // Empty reference is invalid
    if (!refName) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "equation-reference",
          data: refName,
        },
      ],
      consumed,
    };
  },
};
