/**
 * Clear float rule: ~~~~ (4 or more ~ at line start)
 *
 * Variants:
 * - ~~~~ or more: clear:both
 * - ~~~~<: clear:left
 * - ~~~~>: clear:right
 *
 * Note: ~~~ (3 tildes) does NOT work in Wikidot - requires 4+
 */
import type { Element } from "@wdpr/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

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
