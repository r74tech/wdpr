/**
 *
 * Parses the Wikidot comment syntax: `[!-- text --]`.
 *
 * Comments are completely removed from the rendered output. Any content
 * between the opening `[!--` and closing `--]` markers is consumed and
 * discarded. Comments may contain arbitrary text, including markup
 * characters that would otherwise be interpreted.
 *
 * If the closing `--]` is never found (unterminated comment), the rule
 * fails and the opening `[!--` falls through to other rules or the
 * text fallback.
 *
 * Unlike HTML comments (`<!-- -->`), Wikidot comments use square
 * brackets with exclamation marks.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";

/**
 * Inline rule for parsing `[!-- comment --]` syntax.
 *
 * Triggered by a `COMMENT_OPEN` token (`[!--`). Consumes all tokens
 * until a `COMMENT_CLOSE` (`--]`) token is found, then returns an
 * empty elements array (discarding the comment content).
 *
 * Comments may span across newlines. However, if an EOF is reached
 * before the closing marker, the parse fails.
 */
export const commentRule: InlineRule = {
  name: "comment",
  startTokens: ["COMMENT_OPEN"],

  /**
   * Attempts to parse a comment at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with an empty elements array (comment discarded),
   *          or `{ success: false }` if the comment is unterminated
   */
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
