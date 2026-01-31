import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

export const horizontalRuleRule: BlockRule = {
  name: "horizontalRule",
  startTokens: ["HR_MARKER"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const marker = currentToken(ctx);

    if (!marker.lineStart) {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Skip to end of line
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "NEWLINE" || token.type === "EOF") {
        break;
      }
      pos++;
      consumed++;
    }

    // Consume newline
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      consumed++;
    }

    return {
      success: true,
      elements: [{ element: "horizontal-rule" }],
      consumed,
    };
  },
};
