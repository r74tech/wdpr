import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken, hasClosingMarkerBeforeNewline } from "../types";
import { parseInlineUntil } from "./utils";

export const subscriptRule: InlineRule = {
  name: "subscript",
  startTokens: ["SUB_MARKER"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const startToken = currentToken(ctx);

    // Check if closing marker exists
    if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: ctx.pos + 1 }, "SUB_MARKER")) {
      return {
        success: true,
        elements: [{ element: "text", data: startToken.value }],
        consumed: 1,
      };
    }

    // Parse content between markers
    const result = parseInlineUntil({ ...ctx, pos: ctx.pos + 1 }, "SUB_MARKER");

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "subscript",
            attributes: {},
            elements: result.elements,
          },
        },
      ],
      consumed: 1 + result.consumed + 1, // open + content + close
    };
  },
};
