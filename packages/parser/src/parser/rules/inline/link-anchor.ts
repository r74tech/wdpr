import type { Element, LinkLabel } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { hasClosingMarkerBeforeNewline } from "../types";

/**
 * Anchor link: [#anchor label] or [# label] (fake link)
 * Syntax: [#anchor-name Label text] or [# Label text]
 */
export const linkAnchorRule: InlineRule = {
  name: "linkAnchor",
  startTokens: ["BRACKET_ANCHOR"],

  parse(ctx: ParseContext): RuleResult<Element> {
    // Check if closing bracket exists
    if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: ctx.pos + 1 }, "BRACKET_CLOSE")) {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1; // [#

    // Collect anchor name (until whitespace)
    let anchor = "";
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
      anchor += token.value;
      pos++;
      consumed++;
    }

    // Skip whitespace between anchor and label
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
    if (!trimmedLabel) {
      return { success: false };
    }

    // Determine target: if anchor is empty, use javascript:; (fake link)
    // Otherwise, normalize and prepend #
    const target = anchor.trim() ? `#${normalizeAnchor(anchor.trim())}` : "javascript:;";
    const linkLabel: LinkLabel = { text: trimmedLabel };

    return {
      success: true,
      elements: [
        {
          element: "link",
          data: {
            type: "anchor",
            link: target,
            extra: null,
            label: linkLabel,
            target: null,
          },
        },
      ],
      consumed,
    };
  },
};

/**
 * Normalize anchor name (lowercase, replace spaces with hyphens)
 */
function normalizeAnchor(anchor: string): string {
  return anchor.toLowerCase().replace(/\s+/g, "-");
}
