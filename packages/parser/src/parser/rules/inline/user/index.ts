/**
 *
 * Parses the Wikidot user reference syntax: `[[user name]]` and `[[*user name]]`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { userElement } from "./element";
import { parseUserReference } from "./syntax";

export const userRule: InlineRule = {
  name: "user",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const parsed = parseUserReference(ctx, ctx.pos + 1);
    if (!parsed) {
      return { success: false };
    }

    return {
      success: true,
      elements: [userElement(parsed.name, parsed.showAvatar)],
      consumed: 1 + parsed.consumed,
    };
  },
};
