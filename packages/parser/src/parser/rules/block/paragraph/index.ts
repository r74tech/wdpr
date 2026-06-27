/**
 * Paragraph rule
 *
 * Collects inline content until paragraph break (double newline) or end of input.
 * Line breaks within paragraphs are handled by the newlineLineBreakRule.
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { parseInlineContent } from "./content";
import { normalizeParagraphElements } from "./normalize";

/**
 * Paragraph is the fallback block rule.
 *
 * Wikidot behavior:
 * - Single newline -> <br> (handled by newlineLineBreakRule)
 * - Blank line (double newline) -> new paragraph
 */
export const paragraphRule: BlockRule = {
  name: "paragraph",
  startTokens: [],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const result = parseInlineContent(ctx);
    if (result.elements.length === 0) {
      return { success: false };
    }

    const elements = normalizeParagraphElements(result.elements);
    if (elements.length === 0) {
      return { success: false };
    }

    const nextPos = ctx.pos + result.consumed;
    const nextToken = ctx.tokens[nextPos];
    if (nextToken?.type === "COLON" && nextToken.lineStart) {
      return {
        success: true,
        elements: [...elements, { element: "line-break" }],
        consumed: result.consumed,
      };
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements,
          },
        },
      ],
      consumed: result.consumed,
    };
  },
};
