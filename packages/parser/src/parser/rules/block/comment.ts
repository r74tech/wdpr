/**
 * Block-level comment rule: [!-- multiline comment --]
 *
 * Handles comments that span multiple lines. These are completely removed
 * from output (returns empty elements array).
 */
import type { Element } from "@wdpr/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";

export const blockCommentRule: BlockRule = {
  name: "blockComment",
  startTokens: ["COMMENT_OPEN"],
  requiresLineStart: true,

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

        // Consume trailing newline if present
        if (ctx.tokens[pos]?.type === "NEWLINE") {
          consumed++;
        }

        // Return empty elements - comment is discarded
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
