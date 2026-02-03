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
    // _closeSpan is on data directly, not data.attributes
    if (
      elem.element === "container" &&
      elem.data &&
      typeof elem.data === "object" &&
      "type" in elem.data &&
      elem.data.type === "span" &&
      "_closeSpan" in elem.data &&
      (elem.data as any)._closeSpan === true
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

    // Split paragraph at aligned images (they become block-level elements)
    // This also removes float center images (invalid in Wikidot)
    const splitResult = splitAtAlignedImages(elements);
    const hasAlignedImages = splitResult.some((part) => part.type === "image");

    if (splitResult.length > 1 || hasAlignedImages) {
      // Return multiple elements: paragraphs and standalone images
      const outputElements: Element[] = [];
      for (const part of splitResult) {
        if (part.type === "image") {
          outputElements.push(part.element);
        } else if (part.elements.length > 0) {
          // Clean up paragraph elements
          const cleaned = cleanParagraphElements(part.elements);
          if (cleaned.length > 0) {
            outputElements.push({
              element: "container",
              data: {
                type: "paragraph",
                attributes: {},
                elements: cleaned,
              },
            });
          }
        }
      }
      if (outputElements.length === 0) {
        return { success: false };
      }
      return {
        success: true,
        elements: outputElements,
        consumed: result.consumed,
      };
    }

    // Rebuild elements from splitResult (may have float center removed)
    elements = [];
    for (const part of splitResult) {
      if (part.type === "text") {
        elements.push(...part.elements);
      }
    }

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

    // Remove trailing whitespace-only text nodes
    while (elements.length > 0) {
      const last = elements[elements.length - 1];
      if (
        last?.element === "text" &&
        "data" in last &&
        typeof last.data === "string" &&
        last.data.trim() === ""
      ) {
        elements.pop();
      } else {
        break;
      }
    }

    // Remove leading line-breaks
    while (elements.length > 0 && elements[0]?.element === "line-break") {
      elements.shift();
    }

    if (elements.length === 0) {
      return { success: false };
    }

    // Wikidot: text lines immediately before a definition list are not
    // wrapped in <p>. Check if next token starts a definition list.
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

type SplitPart = { type: "text"; elements: Element[] } | { type: "image"; element: Element };

/**
 * Split elements at aligned images
 * Aligned images become block-level elements, splitting the paragraph
 * Float center images are removed entirely (invalid in Wikidot)
 */
function splitAtAlignedImages(elements: Element[]): SplitPart[] {
  const parts: SplitPart[] = [];
  let currentText: Element[] = [];

  for (let i = 0; i < elements.length; i++) {
    const elem = elements[i];
    if (!elem) continue;

    if (isAlignedImage(elem)) {
      const imageData = (elem as any).data;
      // Float center is invalid - skip the image AND preceding text on same line
      if (imageData?.alignment?.float && imageData.alignment.align === "center") {
        // Remove text preceding the image on the same line (back to last line-break)
        while (currentText.length > 0) {
          const last = currentText[currentText.length - 1];
          if (last?.element === "line-break") {
            break;
          }
          currentText.pop();
        }
        // Also skip line-break after the image if present
        if (elements[i + 1]?.element === "line-break") {
          i++;
        }
        continue;
      }

      // Save current text as a part
      if (currentText.length > 0) {
        parts.push({ type: "text", elements: [...currentText] });
        currentText = [];
      }
      // Add image as standalone element
      parts.push({ type: "image", element: elem });
    } else {
      currentText.push(elem);
    }
  }

  // Add remaining text
  if (currentText.length > 0) {
    parts.push({ type: "text", elements: currentText });
  }

  return parts;
}

/**
 * Check if element is an aligned image (has alignment property)
 */
function isAlignedImage(elem: Element): boolean {
  if (elem.element !== "image") return false;
  const data = (elem as any).data;
  return data?.alignment != null;
}

/**
 * Clean up paragraph elements (remove trailing/leading line-breaks)
 */
function cleanParagraphElements(elements: Element[]): Element[] {
  let result = [...elements];

  // Remove trailing line-breaks
  while (result.length > 0 && result[result.length - 1]?.element === "line-break") {
    result.pop();
  }

  // Remove trailing whitespace
  while (result.length > 0) {
    const last = result[result.length - 1];
    if (last?.element === "text" && typeof last.data === "string" && last.data.trim() === "") {
      result.pop();
    } else {
      break;
    }
  }

  // Remove leading line-breaks
  while (result.length > 0 && result[0]?.element === "line-break") {
    result.shift();
  }

  return result;
}
