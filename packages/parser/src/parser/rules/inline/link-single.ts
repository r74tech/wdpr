import type { Element, LinkLabel } from "@wdpr/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { hasClosingMarkerBeforeNewline } from "../types";

/**
 * Single bracket link: [url label]
 * Syntax: [https://example.com/ Label text]
 * Also supports: [/relative-path Label] and [*url Label] for new tab
 */
export const linkSingleRule: InlineRule = {
  name: "linkSingle",
  startTokens: ["BRACKET_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    // Check if closing bracket exists
    if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: ctx.pos + 1 }, "BRACKET_CLOSE")) {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Check for new tab marker (*)
    let newTab = false;
    if (ctx.tokens[pos]?.type === "STAR") {
      newTab = true;
      pos++;
      consumed++;
    }

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

    // URL must be valid (starts with http://, https://, or /)
    const trimmedUrl = url.trim();
    if (!isValidUrl(trimmedUrl)) {
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
      // No closing bracket found
      return { success: false };
    }

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      return { success: false };
    }

    const linkLabel: LinkLabel = { text: trimmedLabel };

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
            target: newTab ? "new-tab" : null,
          },
        },
      ],
      consumed,
    };
  },
};

function isValidUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true;
  if (url.startsWith("http://") || url.startsWith("https://")) return true;
  return false;
}
