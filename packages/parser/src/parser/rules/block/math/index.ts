/**
 *
 * Block rule for the Wikidot math block: `[[math name]]...[[/math]]`.
 *
 * A math block captures LaTeX source code between the tags and stores it
 * as a `math` element in the AST. The content is not parsed for inline
 * markup.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { findMathOpen, findMathBodyBounds } from "./boundary";

/**
 * Block rule for `[[math name]]...[[/math]]`.
 *
 * Content is captured as raw LaTeX source. BACKSLASH_BREAK tokens are
 * restored to their original `\\\n` form for correct LaTeX rendering.
 */
export const mathBlockRule: BlockRule = {
  name: "math",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    const open = findMathOpen(ctx.tokens, ctx.pos);
    if (!open) return { success: false };
    const bounds = findMathBodyBounds(ctx.tokens, open.bodyStart);
    if (!bounds.foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/math]] for [[math]]",
        position: openToken.position,
      });
    }
    if (!bounds.hasContent) {
      return { success: false };
    }
    const latexSource = ctx.tokens
      .slice(open.bodyStart, bounds.closeStart)
      .map((token) => (token.type === "BACKSLASH_BREAK" ? "\\\n" : token.value))
      .join("")
      .trim();
    const name = ctx.tokens
      .slice(open.nameStart, open.nameEnd)
      .map((token) => token.value)
      .join("");
    return {
      success: true,
      elements: [
        {
          element: "math",
          data: {
            name: name || null,
            "latex-source": latexSource,
          },
        },
      ],
      consumed: bounds.end - ctx.pos,
    };
  },
};
