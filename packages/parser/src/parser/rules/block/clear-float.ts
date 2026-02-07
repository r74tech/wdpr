/**
 * @module clear-float
 *
 * Block rule for Wikidot's float-clearing syntax: `~~~~`.
 *
 * Four or more tilde characters (`~`) at the start of a line produce a
 * `<div style="clear: both;">` (or left/right) element. This is commonly
 * used after floated images or divs to prevent subsequent content from
 * wrapping alongside them.
 *
 * Variants:
 * - `~~~~` (or more tildes) -- `clear: both`
 * - `~~~~<` -- `clear: left`
 * - `~~~~>` -- `clear: right`
 *
 * Three tildes (`~~~`) do NOT trigger this rule in Wikidot -- the minimum
 * is four. The tilde count is validated at parse time even though the
 * lexer already tokenises valid sequences, as a defensive check.
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Block rule for the clear-float directive (`~~~~`, `~~~~<`, `~~~~>`).
 *
 * Produces a `clear-float` element whose data is the direction string:
 * `"both"`, `"left"`, or `"right"`.
 */
export const clearFloatRule: BlockRule = {
  name: "clear-float",
  startTokens: ["CLEAR_FLOAT", "CLEAR_FLOAT_LEFT", "CLEAR_FLOAT_RIGHT"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const token = currentToken(ctx);

    if (!token.lineStart) {
      return { success: false };
    }

    // Count tildes - Wikidot requires at least 4
    const tildeCount = token.value.replace(/[<>]$/, "").length;
    if (tildeCount < 4) {
      return { success: false };
    }

    // Determine direction
    let direction: "both" | "left" | "right" = "both";
    if (token.type === "CLEAR_FLOAT_LEFT") {
      direction = "left";
    } else if (token.type === "CLEAR_FLOAT_RIGHT") {
      direction = "right";
    }

    let consumed = 1;

    // Consume newline if present
    if (ctx.tokens[ctx.pos + 1]?.type === "NEWLINE") {
      consumed++;
    }

    return {
      success: true,
      elements: [
        {
          element: "clear-float",
          data: direction,
        },
      ],
      consumed,
    };
  },
};
