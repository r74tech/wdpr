import type { Element, LinkLabel } from "@wdpr/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { hasClosingMarkerBeforeNewline } from "../types";

/**
 * Star link (new tab): [* url label]
 * Syntax: [*https://example.com/ Label text]
 */
export const linkStarRule: InlineRule = {
  name: "linkStar",
  startTokens: ["BRACKET_STAR"],

  parse(ctx: ParseContext): RuleResult<Element> {
    // Check if closing bracket exists
    if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: ctx.pos + 1 }, "BRACKET_CLOSE")) {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1; // [*

    // Collect URL (until whitespace)
    let url = "";
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (
        !token ||
        token.type === "WHITESPACE" ||
        token.type === "BRACKET_CLOSE" ||
        token.type === "NEWLINE" ||
        token.type === "EOF"
      ) {
        break;
      }
      url += token.value;
      pos++;
      consumed++;
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return { success: false };
    }

    // Skip whitespace between URL and label
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Collect label (until closing bracket)
    let label = "";
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (
        !token ||
        token.type === "BRACKET_CLOSE" ||
        token.type === "NEWLINE" ||
        token.type === "EOF"
      ) {
        break;
      }
      label += token.value;
      pos++;
      consumed++;
    }

    // Consume closing bracket
    if (ctx.tokens[pos]?.type === "BRACKET_CLOSE") {
      pos++;
      consumed++;
    } else {
      return { success: false };
    }

    const trimmedLabel = label.trim();
    // If no label, use URL as label
    const displayLabel = trimmedLabel || trimmedUrl;
    const linkLabel: LinkLabel = { text: displayLabel };

    return {
      success: true,
      elements: [
        {
          element: "link",
          data: {
            type: "direct",
            link: trimmedUrl,
            extra: null,
            label: linkLabel,
            target: "new-tab",
          },
        },
      ],
      consumed,
    };
  },
};
