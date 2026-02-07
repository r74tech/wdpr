/**
 * @module math-inline
 *
 * Parses the Wikidot inline math syntax: `[[$ LaTeX $]]`.
 *
 * Inline math renders a LaTeX expression inline with the surrounding
 * text (as opposed to the block-level `[[math]]` which produces a
 * display-mode equation).
 *
 * The LaTeX source is captured as-is between the `$` delimiters and
 * stored in the AST for later rendering by a LaTeX engine (e.g. KaTeX
 * or MathJax).
 *
 * Newlines are NOT allowed within inline math; if a `NEWLINE` token is
 * encountered before the closing `$]]`, the parse fails.
 *
 * Wikidot syntax: `[[$ E = mc^2 $]]`
 *
 * Produces a `"math-inline"` AST element with `data["latex-source"]`
 * containing the trimmed LaTeX string.
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Inline rule for parsing `[[$ LaTeX $]]` inline math.
 *
 * Triggered by a `BLOCK_OPEN` (`[[`) token. Looks for a `$` text
 * token immediately after, collects the LaTeX source until the closing
 * `$]]` sequence, and produces a math-inline element.
 *
 * Fails if:
 * - No `$` follows the `[[`
 * - A newline is encountered within the LaTeX source
 * - The closing `$]]` sequence is not found
 */
export const mathInlineRule: InlineRule = {
  name: "math-inline",
  startTokens: ["BLOCK_OPEN"],

  /**
   * Attempts to parse inline math at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with a `"math-inline"` element, or `{ success: false }`
   */
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
