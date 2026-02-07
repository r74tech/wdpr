/**
 * @module guillemet
 *
 * Parses Wikidot's guillemet (angle quotation mark) syntax.
 *
 * Converts ASCII double-angle-bracket sequences into their Unicode
 * typographic equivalents:
 * - `<<` becomes `\u00AB` (LEFT-POINTING DOUBLE ANGLE QUOTATION MARK)
 * - `>>` becomes `\u00BB` (RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK)
 *
 * These typographic characters are commonly used in European languages
 * (particularly French and Russian) as quotation marks. Wikidot provides
 * this shorthand so authors do not need to type the Unicode characters
 * directly.
 *
 * Produces a `"text"` AST element containing the Unicode character.
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";

/**
 * Inline rule for converting `<<` and `>>` to typographic guillemets.
 *
 * Triggered by `LEFT_DOUBLE_ANGLE` or `RIGHT_DOUBLE_ANGLE` tokens.
 * This is a simple one-to-one token replacement with no content
 * parsing or nesting.
 */
export const guillemetRule: InlineRule = {
  name: "guillemet",
  startTokens: ["LEFT_DOUBLE_ANGLE", "RIGHT_DOUBLE_ANGLE"],

  /**
   * Converts a double-angle-bracket token to its Unicode guillemet equivalent.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with a `"text"` element containing the
   *          Unicode guillemet character, or `{ success: false }` if the
   *          token is neither `<<` nor `>>`
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const token = ctx.tokens[ctx.pos];

    // << → «
    if (token?.type === "LEFT_DOUBLE_ANGLE") {
      return {
        success: true,
        elements: [{ element: "text", data: "\u00AB" }],
        consumed: 1,
      };
    }

    // >> → »
    if (token?.type === "RIGHT_DOUBLE_ANGLE") {
      return {
        success: true,
        elements: [{ element: "text", data: "\u00BB" }],
        consumed: 1,
      };
    }

    return { success: false };
  },
};
