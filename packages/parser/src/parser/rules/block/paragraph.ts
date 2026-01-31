/**
 * Paragraph rule
 *
 * Collects inline content until paragraph break (double newline) or end of input.
 * Line breaks within paragraphs are handled by the newlineLineBreakRule.
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { parseInlineUntil } from "../inline/utils";

/**
 * Process closeSpan markers in inline content
 * When we find a _closeSpan marker, wrap all preceding content in a span
 */
function processCloseSpanMarkers(elements: Element[]): Element[] {
  const result: Element[] = [];

  for (let i = 0; i < elements.length; i++) {
    const elem = elements[i];

    if (!elem) continue;

    // Check for closeSpan marker
    if (
      elem.element === "container" &&
      elem.data &&
      typeof elem.data === "object" &&
      "type" in elem.data &&
      elem.data.type === "span" &&
      "attributes" in elem.data &&
      typeof elem.data.attributes === "object" &&
      elem.data.attributes &&
      "_closeSpan" in elem.data.attributes
    ) {
      // Wrap all preceding content in a span
      if (result.length > 0) {
        const spanContent = [...result];
        result.length = 0; // Clear result
        result.push({
          element: "container",
          data: {
            type: "span",
            attributes: {},
            elements: spanContent,
          },
        });
      }
      // Don't add the marker itself to output
    } else {
      result.push(elem);
    }
  }

  return result;
}

/**
 * Paragraph is the fallback block rule
 * It collects inline content until blank line (double newline)
 *
 * Wikidot behavior:
 * - Single newline → <br> (handled by newlineLineBreakRule)
 * - Blank line (double newline) → new paragraph
 */
export const paragraphRule: BlockRule = {
  name: "paragraph",
  startTokens: [], // matches anything not matched by other rules
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    // Parse inline content, including NEWLINEs
    // Stop at double NEWLINE (paragraph break) or EOF
    const result = parseInlineContent(ctx);

    // Filter out empty paragraphs
    if (result.elements.length === 0) {
      return { success: false };
    }

    // Process closeSpan markers (for split spans)
    let elements = processCloseSpanMarkers(result.elements);

    // Remove trailing line-breaks (they shouldn't appear at end of paragraph)
    // Exception: line-breaks flagged by preserveTrailingLineBreak context are kept
    while (elements.length > 0 && elements[elements.length - 1]?.element === "line-break") {
      const lastEl = elements[elements.length - 1] as any;
      if (lastEl._preservedTrailingBreak) {
        delete lastEl._preservedTrailingBreak;
        break;
      }
      elements.pop();
    }

    // Remove leading line-breaks
    while (elements.length > 0 && elements[0]?.element === "line-break") {
      elements.shift();
    }

    if (elements.length === 0) {
      return { success: false };
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

/**
 * Parse inline content until paragraph break or EOF
 */
function parseInlineContent(ctx: ParseContext): {
  elements: Element[];
  consumed: number;
} {
  // Use the standard inline parser which now handles NEWLINEs
  // The parser will stop at double NEWLINE (paragraph break)
  return parseInlineUntil(ctx, "PARAGRAPH_BREAK" as any);
}
