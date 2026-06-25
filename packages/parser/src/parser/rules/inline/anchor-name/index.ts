/**
 *
 * Parses the Wikidot named anchor syntax: `[[# name]]`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseAnchorNameTarget } from "./syntax";

export const anchorNameRule: InlineRule = {
  name: "anchorName",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const target = parseAnchorNameTarget(ctx, ctx.pos + 1);
    if (!target) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "anchor-name",
          data: target.name,
        },
      ],
      consumed: 1 + target.consumed,
    };
  },
};
