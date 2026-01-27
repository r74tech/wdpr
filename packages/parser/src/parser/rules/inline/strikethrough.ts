import type { Element } from "@wdpr/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { parseInlineUntil } from "./utils";

/**
 * Check if strikethrough is valid at current position.
 * Returns false if:
 * - No closing marker before newline
 * - Closing marker is preceded by whitespace (e.g. "-- text --")
 * - Opening marker is followed by whitespace that leads to closing
 */
function isValidStrikethrough(ctx: ParseContext): boolean {
  let pos = ctx.pos + 1; // Start after opening marker
  let prevWasWhitespace = false;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      return false;
    }

    if (token.type === "STRIKE_MARKER") {
      // Found closing marker
      // Invalid if preceded by whitespace
      if (prevWasWhitespace) {
        return false;
      }
      return true;
    }

    prevWasWhitespace = token.type === "WHITESPACE";
    pos++;
  }
  return false;
}

export const strikethroughRule: InlineRule = {
  name: "strikethrough",
  startTokens: ["STRIKE_MARKER"],

  parse(ctx: ParseContext): RuleResult<Element> {
    // Check if valid strikethrough (no whitespace before closing --)
    if (!isValidStrikethrough(ctx)) {
      // Not valid strikethrough, convert to em-dash
      return {
        success: true,
        elements: [{ element: "text", data: "\u2014" }], // em-dash
        consumed: 1,
      };
    }

    // Parse content between markers
    const result = parseInlineUntil({ ...ctx, pos: ctx.pos + 1 }, "STRIKE_MARKER");

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "strikethrough",
            attributes: {},
            elements: result.elements,
          },
        },
      ],
      consumed: 1 + result.consumed + 1, // open + content + close
    };
  },
};
