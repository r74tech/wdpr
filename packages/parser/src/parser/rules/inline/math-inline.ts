import type { Element } from "@wdpr/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Inline math: [[$ ... $]]
 */
export const mathInlineRule: InlineRule = {
  name: "math-inline",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Expect $
    if (ctx.tokens[pos]?.type !== "TEXT" || ctx.tokens[pos]?.value !== "$") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Collect LaTeX content until $]]
    let latexSource = "";

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token) break;

      // No newlines allowed in inline math
      if (token.type === "NEWLINE") {
        return { success: false };
      }

      // Check for closing $]]
      if (
        token.type === "TEXT" &&
        token.value === "$" &&
        ctx.tokens[pos + 1]?.type === "BLOCK_CLOSE"
      ) {
        break;
      }

      latexSource += token.value;
      pos++;
      consumed++;
    }

    // Expect $]]
    if (ctx.tokens[pos]?.type !== "TEXT" || ctx.tokens[pos]?.value !== "$") {
      return { success: false };
    }
    pos++;
    consumed++;

    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Trim the LaTeX source
    latexSource = latexSource.trim();

    return {
      success: true,
      elements: [
        {
          element: "math-inline",
          data: {
            "latex-source": latexSource,
          },
        },
      ],
      consumed,
    };
  },
};
