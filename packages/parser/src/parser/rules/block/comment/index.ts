/**
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
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { consumeBlockComment } from "./consume";

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
    const result = consumeBlockComment(ctx);

    // Unterminated comment — let the inline comment rule emit the diagnostic
    // to avoid duplication when the paragraph fallback retries this token.
    if (!result) {
      return { success: false };
    }

    return {
      success: true,
      elements: [],
      consumed: result.consumed,
    };
  },
};
