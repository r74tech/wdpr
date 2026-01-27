import type { Element } from "@wdpr/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken, hasClosingMarkerBeforeParagraphBreak } from "../types";
import { parseInlineUntil } from "./utils";

export const underlineRule: InlineRule = {
  name: "underline",
  startTokens: ["UNDERLINE_MARKER"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const startToken = currentToken(ctx);

    // Check if closing marker exists before paragraph break
    if (!hasClosingMarkerBeforeParagraphBreak({ ...ctx, pos: ctx.pos + 1 }, "UNDERLINE_MARKER")) {
      return {
        success: true,
        elements: [{ element: "text", data: startToken.value }],
        consumed: 1,
      };
    }

    // Parse content between markers, handling newlines as line-breaks
    const children: Element[] = [];
    let pos = ctx.pos + 1;
    let consumed = 1; // opening marker

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") break;

      // Found closing marker
      if (token.type === "UNDERLINE_MARKER") {
        consumed++;
        break;
      }

      // Handle newlines as line-breaks
      if (token.type === "NEWLINE") {
        children.push({ element: "line-break" });
        pos++;
        consumed++;
        continue;
      }

      // Parse inline content until NEWLINE or closing marker
      const inlineCtx = { ...ctx, pos };
      const result = parseInlineUntil(inlineCtx, "UNDERLINE_MARKER");
      if (result.elements.length > 0) {
        children.push(...result.elements);
        pos += result.consumed;
        consumed += result.consumed;
      } else {
        children.push({ element: "text", data: token.value });
        pos++;
        consumed++;
      }
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "underline",
            attributes: {},
            elements: children,
          },
        },
      ],
      consumed,
    };
  },
};
