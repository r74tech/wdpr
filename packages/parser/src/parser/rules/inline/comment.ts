import type { Element } from "@wdpr/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";

/**
 * Comment: [!-- text --]
 * Comments are discarded from output
 */
export const commentRule: InlineRule = {
  name: "comment",
  startTokens: ["COMMENT_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    let pos = ctx.pos + 1; // skip [!--
    let consumed = 1;

    // Consume all tokens until we find --]
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token) {
        break;
      }

      if (token.type === "COMMENT_CLOSE") {
        consumed++;
        pos++;
        // Return empty result - comment is discarded
        return {
          success: true,
          elements: [],
          consumed,
        };
      }

      if (token.type === "EOF") {
        // Unterminated comment - fail
        return { success: false };
      }

      pos++;
      consumed++;
    }

    return { success: false };
  },
};
