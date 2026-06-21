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
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { parseInlineUntil } from "../../inline/utils";
import { parseHeadingOpen } from "./open";
import { extractHeadingText } from "./toc-text";

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
    const openResult = parseHeadingOpen(ctx);
    if (!openResult) {
      return { success: false };
    }

    // Parse inline content until newline
    let pos = openResult.bodyStart;
    let consumed = openResult.consumed;
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
    if (!openResult.hidden) {
      const headingText = extractHeadingText(children);
      ctx.tocEntries.push({ level: openResult.level, text: headingText });
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: { header: { level: openResult.level, "has-toc": !openResult.hidden } },
            attributes: {},
            elements: children,
          },
        },
      ],
      consumed,
    };
  },
};
