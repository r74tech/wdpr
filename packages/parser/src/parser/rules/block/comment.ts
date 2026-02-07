/**
 * @module comment
 *
 * Block rule for Wikidot comments: `[!-- ... --]`.
 *
 * Comments may span multiple lines and are completely stripped from the
 * rendered output. The parser consumes all tokens from COMMENT_OPEN
 * (`[!--`) through the matching COMMENT_CLOSE (`--]`), inclusive, plus
 * any trailing newline.
 *
 * If the closing `--]` is never found (unterminated comment), the rule
 * fails and tokens are left for other rules to handle.
 *
 * This rule requires line start so that inline comments appearing mid-line
 * are handled by a separate inline rule instead.
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";

/**
 * Block rule for line-start comments (`[!-- ... --]`).
 *
 * Returns an empty elements array on success -- comments produce no output.
 */
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
