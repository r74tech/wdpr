/**
 *
 * Parses the Wikidot inline color syntax: `##color|text##`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { parseColorContent } from "./syntax";

export const colorRule: InlineRule = {
  name: "color",
  startTokens: ["COLOR_MARKER"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const parsed = parseColorContent(ctx);
    if (!parsed) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "color",
          data: {
            color: parsed.color,
            elements: parsed.elements,
          },
        },
      ],
      consumed: parsed.consumed,
    };
  },
};
