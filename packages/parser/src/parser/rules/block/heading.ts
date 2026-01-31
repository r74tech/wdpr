import type { Element, HeadingLevel } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseInlineUntil } from "../inline/utils";

export const headingRule: BlockRule = {
  name: "heading",
  startTokens: ["HEADING_MARKER"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const marker = currentToken(ctx);

    if (!marker.lineStart) {
      return { success: false };
    }

    // Wikidot requires whitespace after heading marker
    // Check format: + (space)content OR +* (space)content
    let pos = ctx.pos + 1;
    let consumed = 1;
    let hidden = false;

    // Check for hidden marker (*) - must come immediately after + markers
    if (ctx.tokens[pos]?.type === "STAR") {
      hidden = true;
      pos++;
      consumed++;
    }

    // Whitespace is required after + or +*
    if (ctx.tokens[pos]?.type !== "WHITESPACE") {
      return { success: false };
    }

    const depth = Math.min(marker.value.length, 6) as 1 | 2 | 3 | 4 | 5 | 6;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse inline content until newline
    const inlineCtx: ParseContext = { ...ctx, pos };
    const inlineResult = parseInlineUntil(inlineCtx, "NEWLINE");
    const children: Element[] = inlineResult.elements;
    consumed += inlineResult.consumed;
    pos += inlineResult.consumed;

    // Consume newline
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      consumed++;
    }

    // Store TOC entry (only non-hidden headings)
    if (!hidden) {
      const headingText = extractText(children);
      ctx.tocEntries.push({ level: depth, text: headingText });
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: { header: { level: depth as HeadingLevel, "has-toc": !hidden } },
            attributes: {},
            elements: children,
          },
        },
      ],
      consumed,
    };
  },
};

/**
 * Extract text content from elements for TOC
 */
function extractText(elements: Element[]): string {
  let text = "";
  for (const el of elements) {
    if (el.element === "text" && typeof el.data === "string") {
      text += el.data;
    } else if (
      el.element === "container" &&
      el.data &&
      typeof el.data === "object" &&
      "elements" in el.data
    ) {
      text += extractText(el.data.elements as Element[]);
    }
  }
  return text;
}
