/**
 *
 * Block rule for Wikidot headings: `+ Heading` through `++++++ Heading`.
 *
 * Headings are written with one to six `+` characters at the start of a
 * line, followed by mandatory whitespace and then inline content:
 *
 * ```
 * + H1 heading
 * ++ H2 heading
 * +++ H3 heading
 * ```
 *
 * An optional `*` immediately after the `+` markers hides the heading
 * from the table of contents:
 *
 * ```
 * +* Hidden H1
 * ```
 *
 * Seven or more `+` characters are NOT valid headings in Wikidot and
 * the rule will fail, letting them fall through to paragraph parsing.
 *
 * Non-hidden headings are registered in `ctx.tocEntries` for later use
 * by the table-of-contents module.
 *
 * @module
 */
import type { Element, HeadingLevel } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseInlineUntil } from "../inline/utils";

/**
 * Block rule for Wikidot headings (`+ ` through `++++++ `).
 *
 * Produces a container element with `type: { header: { level, "has-toc" } }`.
 * The heading text is parsed for inline markup (bold, links, etc.).
 */
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

    // Wikidot only supports h1-h6 (1-6 plus signs). 7+ is not a heading.
    if (marker.value.length > 6) {
      return { success: false };
    }
    const depth = marker.value.length as 1 | 2 | 3 | 4 | 5 | 6;

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
 * Recursively extracts the plain-text content from a tree of elements.
 *
 * Used to build the `text` field for table-of-contents entries. Only
 * `text` elements and containers with nested `elements` are traversed;
 * other element types (images, etc.) are ignored.
 *
 * @param elements - The heading's inline child elements.
 * @returns Concatenated plain text.
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
