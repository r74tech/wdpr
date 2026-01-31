import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { hasClosingMarkerBeforeNewline } from "../types";
import { parseInlineUntil } from "./utils";

/**
 * Color: ##color|text##
 * Syntax: ##c00|Apple## or ##blue|Text##
 * Color can be hex (3 or 6 digits), named color, or CSS color function
 */
export const colorRule: InlineRule = {
  name: "color",
  startTokens: ["COLOR_MARKER"],

  parse(ctx: ParseContext): RuleResult<Element> {
    // Check if closing marker exists
    if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: ctx.pos + 1 }, "COLOR_MARKER")) {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1; // ##

    // Collect color specification until PIPE
    let colorSpec = "";
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (
        !token ||
        token.type === "PIPE" ||
        token.type === "COLOR_MARKER" ||
        token.type === "NEWLINE" ||
        token.type === "EOF"
      ) {
        break;
      }
      colorSpec += token.value;
      pos++;
      consumed++;
    }

    // Must have a PIPE separator
    if (ctx.tokens[pos]?.type !== "PIPE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Parse inline content until closing ##
    const contentResult = parseInlineUntil({ ...ctx, pos }, "COLOR_MARKER");
    pos += contentResult.consumed;
    consumed += contentResult.consumed;

    // Consume closing ##
    if (ctx.tokens[pos]?.type === "COLOR_MARKER") {
      pos++;
      consumed++;
    } else {
      return { success: false };
    }

    const textChildren = contentResult.elements;

    const trimmedColor = colorSpec.trim();

    // Wikidot allows empty color (##|text##), but text must have content
    if (textChildren.length === 0) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "color",
          data: {
            color: hexifyColor(trimmedColor),
            elements: textChildren,
          },
        },
      ],
      consumed,
    };
  },
};

/**
 * If the color is a 3 or 6 digit hex color, prepend #
 */
function hexifyColor(color: string): string {
  if (/^[a-fA-F0-9]{3}$/.test(color) || /^[a-fA-F0-9]{6}$/.test(color)) {
    return `#${color}`;
  }
  return color;
}
