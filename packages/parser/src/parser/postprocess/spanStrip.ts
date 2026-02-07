/**
 * @module postprocess/spanStrip
 *
 * Post-processing pass for paragraph merging and cleanup in the parsed AST.
 *
 * This module handles two related Wikidot behaviors:
 *
 * 1. **Paragraph strip (`span_`)**: In Wikidot, the `[[span_]]` inline element
 *    removes paragraph boundaries around it. When a paragraph contains a `span_`
 *    marker, it becomes a "merge anchor" that absorbs adjacent paragraphs. The
 *    merged content is unwrapped (no `<p>` tag), matching Wikidot's rendering.
 *    Content after a blank line inside `span_` becomes "escaped" and is placed
 *    outside the merged paragraph.
 *
 * 2. **Empty `[[#expr ]]` paragraph splitting**: An `[[#expr ]]` element with
 *    an empty expression acts as a paragraph break, splitting the containing
 *    paragraph into separate paragraphs.
 *
 * Additionally, this module recursively cleans internal flags (`_paragraphStrip`,
 * `_emptyParagraphStrip`, `_escapedFromParagraph`, `_splitByBlankLine`) from AST
 * elements. These flags are used during parsing as inter-pass communication and
 * must not appear in the final output.
 */
import type { Element, ContainerData, ExprData } from "@wdprlib/ast";

/**
 * Check if an element is a container with a specific container type.
 *
 * @param el - The element to check
 * @param type - The container type to match (e.g., "paragraph", "span", "div")
 * @returns true if the element is a container of the specified type
 */
function isContainer(el: Element, type: string): boolean {
  if (el.element !== "container") return false;
  const data = el.data as ContainerData;
  return data.type === type;
}

/**
 * Extract ContainerData from an element, if it is a container.
 *
 * @param el - The element to extract data from
 * @returns The container's data, or null if the element is not a container
 */
function getContainerData(el: Element): ContainerData | null {
  if (el.element !== "container") return null;
  return el.data as ContainerData;
}

/**
 * Check if an element is a `span_` marker (paragraph strip indicator).
 *
 * During parsing, `[[span_]]` elements are annotated with `_paragraphStrip`
 * or `_emptyParagraphStrip` internal flags. This function detects those markers
 * so the post-processor can merge adjacent paragraphs.
 *
 * @param el - The element to check (may be undefined for boundary checks)
 * @returns true if the element is a span with a paragraph-strip flag
 */
function isSpanStripMarker(el: Element | undefined): boolean {
  if (!el || el.element !== "container") return false;
  const data = el.data as ContainerData & {
    _paragraphStrip?: boolean;
    _emptyParagraphStrip?: boolean;
  };
  return (
    data.type === "span" && (data._paragraphStrip === true || data._emptyParagraphStrip === true)
  );
}

/**
 * Check if a paragraph contains at least one `span_` marker among its children.
 *
 * A paragraph with a `span_` marker becomes a "merge anchor" that can absorb
 * adjacent paragraphs during post-processing.
 *
 * @param para - A paragraph element to inspect
 * @returns true if the paragraph contains a child with a paragraph-strip flag
 */
function hasParagraphStripSpan(para: Element): boolean {
  const data = getContainerData(para);
  if (!data || data.type !== "paragraph") return false;
  return data.elements.some((child) => isSpanStripMarker(child));
}

/**
 * Check if an element is an "escaped span" (content after a blank line inside `span_`).
 *
 * In Wikidot, when a blank line appears inside a `[[span_]]` block, the content
 * after the blank line escapes the paragraph and is rendered outside it. These
 * spans are marked with `_escapedFromParagraph` during parsing.
 *
 * @param el - The element to check
 * @returns true if the element is a span marked as escaped from its paragraph
 */
function isEscapedSpan(el: Element): boolean {
  if (el.element !== "container") return false;
  const data = el.data as ContainerData & { _escapedFromParagraph?: boolean };
  return data.type === "span" && data._escapedFromParagraph === true;
}

/**
 * Extract escaped spans and all subsequent content from a paragraph's children.
 *
 * When an escaped span is found, it and everything after it is removed from the
 * original children array (mutated in place via `splice`) and returned as a
 * separate array of span elements. Non-span content between escaped spans is
 * collected and wrapped in anonymous span elements.
 *
 * This models Wikidot's behavior where once a blank line occurs inside `span_`,
 * all subsequent content is rendered outside the paragraph.
 *
 * @param children - Mutable array of paragraph children; escaped items are spliced out
 * @returns Array of span elements that should be rendered outside the paragraph
 */
function extractEscapedSpans(children: Element[]): Element[] {
  const escaped: Element[] = [];

  // Find the first escaped span
  let firstEscapedIndex = -1;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child && isEscapedSpan(child)) {
      firstEscapedIndex = i;
      break;
    }
  }

  if (firstEscapedIndex === -1) {
    return escaped;
  }

  // Extract everything from the first escaped span onwards
  // Group content into spans
  let currentSpanChildren: Element[] = [];

  for (let i = firstEscapedIndex; i < children.length; i++) {
    const child = children[i];
    if (!child) continue;

    if (isEscapedSpan(child)) {
      // Add current span if any
      if (currentSpanChildren.length > 0) {
        escaped.push({
          element: "container",
          data: {
            type: "span",
            attributes: {},
            elements: currentSpanChildren,
          },
        });
        currentSpanChildren = [];
      }
      // Add the escaped span itself
      escaped.push(child);
    } else if (isSpanStripMarker(child)) {
      // Regular span_ after escaped - convert to escaped
      const childData = getContainerData(child);
      if (childData) {
        escaped.push({
          element: "container",
          data: {
            type: "span",
            attributes: childData.attributes,
            elements: childData.elements,
          },
        });
      }
    } else {
      // Non-span content after escaped - collect into a span
      currentSpanChildren.push(child);
    }
  }

  // Add remaining content as a span
  if (currentSpanChildren.length > 0) {
    escaped.push({
      element: "container",
      data: {
        type: "span",
        attributes: {},
        elements: currentSpanChildren,
      },
    });
  }

  // Remove extracted items from original array
  children.splice(firstEscapedIndex);

  return escaped;
}

/**
 * Remove line-break elements adjacent to `span_` markers and remove empty `span_` markers.
 *
 * Wikidot's `span_` removes paragraph boundaries, including the line-breaks that
 * would normally appear between merged paragraphs. Empty `span_` markers (created
 * by `[[span_]][[/span]]` with no content) are also removed as they serve no purpose.
 *
 * Uses a single reverse pass to safely splice elements without index invalidation.
 *
 * @param children - Mutable array of merged paragraph children; modified in place
 */
function removeLineBreaksAroundSpanStrip(children: Element[]): void {
  // Single reverse pass: check each element for removal criteria
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (!child) continue;

    // Check for line-break adjacent to span_ markers
    if (child.element === "line-break") {
      const prev = children[i - 1];
      const next = children[i + 1];
      if (isSpanStripMarker(prev) || isSpanStripMarker(next)) {
        children.splice(i, 1);
        continue;
      }
    }

    // Check for empty span_ markers
    if (child.element === "container") {
      const data = child.data as ContainerData & { _emptyParagraphStrip?: boolean };
      if (data.type === "span" && data._emptyParagraphStrip) {
        children.splice(i, 1);
      }
    }
  }
}

/**
 * Check if an element is a span that was split by a blank line.
 *
 * When a blank line appears inside `[[span]]..[[/span]]`, the parser marks the
 * span with `_splitByBlankLine`. During post-processing, the containing paragraph
 * is split at these markers so each part becomes its own paragraph.
 *
 * @param el - The element to check
 * @returns true if the element is a span marked with `_splitByBlankLine`
 */
function isSplitSpan(el: Element): boolean {
  if (el.element !== "container") return false;
  const data = el.data as ContainerData;
  return data.type === "span" && data._splitByBlankLine === true;
}

/**
 * Split a paragraph at spans marked with `_splitByBlankLine`.
 *
 * Each `_splitByBlankLine` span starts a new paragraph. Content before the first
 * split span remains in the initial paragraph; each split span begins a new one.
 *
 * @param para - A paragraph element that may contain split-marked spans
 * @returns Array of paragraph elements (one or more); returns the original
 *          element in a single-element array if no splits are needed
 */
function splitParagraphAtBlankLineSpans(para: Element): Element[] {
  const data = getContainerData(para);
  if (!data || data.type !== "paragraph") return [para];

  const result: Element[] = [];
  let currentElements: Element[] = [];

  for (const child of data.elements) {
    if (isSplitSpan(child)) {
      // Save current paragraph if not empty
      if (currentElements.length > 0) {
        result.push({
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: currentElements,
          },
        });
        currentElements = [];
      }
      // Start new paragraph with this span
      currentElements.push(child);
    } else {
      currentElements.push(child);
    }
  }

  // Add remaining elements as final paragraph
  if (currentElements.length > 0) {
    result.push({
      element: "container",
      data: {
        type: "paragraph",
        attributes: {},
        elements: currentElements,
      },
    });
  }

  return result.length > 0 ? result : [para];
}

/**
 * Check if an element is an empty `[[#expr ]]` (expression is an empty string).
 *
 * In Wikidot markup, `[[# ]]` with an empty expression acts as a paragraph
 * break without generating visible output.
 *
 * @param el - The element to check
 * @returns true if the element is an expr with an empty expression string
 */
function isEmptyExpr(el: Element): boolean {
  if (el.element !== "expr") return false;
  const data = el.data as ExprData;
  return data.expression === "";
}

/**
 * Split a paragraph at empty `[[#expr ]]` elements.
 *
 * Each empty expr acts as a paragraph break. Line-break elements immediately
 * before or after an empty expr are also removed to avoid spurious whitespace.
 *
 * @param para - A paragraph element that may contain empty expr elements
 * @returns Array of paragraph elements; empty if all content was consumed by splits
 */
function splitParagraphAtEmptyExpr(para: Element): Element[] {
  const data = getContainerData(para);
  if (!data || data.type !== "paragraph") return [para];

  // Check if paragraph contains empty expr
  const hasEmptyExpr = data.elements.some(isEmptyExpr);
  if (!hasEmptyExpr) return [para];

  const result: Element[] = [];
  let currentElements: Element[] = [];

  for (let i = 0; i < data.elements.length; i++) {
    const child = data.elements[i];
    if (!child) continue;

    if (isEmptyExpr(child)) {
      // Skip the empty expr and surrounding line-breaks
      // Check if prev element is line-break, remove it
      if (
        currentElements.length > 0 &&
        currentElements[currentElements.length - 1]?.element === "line-break"
      ) {
        currentElements.pop();
      }
      // Save current paragraph if not empty
      if (currentElements.length > 0) {
        result.push({
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: currentElements,
          },
        });
        currentElements = [];
      }
      // Skip next line-break if present
      if (i + 1 < data.elements.length && data.elements[i + 1]?.element === "line-break") {
        i++;
      }
    } else {
      currentElements.push(child);
    }
  }

  // Add remaining elements as final paragraph
  if (currentElements.length > 0) {
    result.push({
      element: "container",
      data: {
        type: "paragraph",
        attributes: {},
        elements: currentElements,
      },
    });
  }

  return result.length > 0 ? result : [];
}

/**
 * Merge and split paragraphs according to Wikidot's `span_` and expr behaviors.
 *
 * This is the main post-processing entry point for paragraph restructuring.
 * It performs two passes over the top-level element list:
 *
 * **First pass**: Split paragraphs at `_splitByBlankLine` spans and empty `[[#expr ]]`
 * elements. A single input paragraph may become multiple output paragraphs.
 *
 * **Second pass**: Merge consecutive paragraphs around `span_` markers. When a
 * paragraph contains a `span_` marker, it absorbs adjacent paragraphs (even those
 * without `span_`). The merged content is unwrapped (no `<p>` tag), matching
 * Wikidot's rendering behavior. Escaped spans (content after blank lines in `span_`)
 * are extracted and placed outside the merged paragraph.
 *
 * @param children - Top-level element array from the parser
 * @returns Restructured element array with paragraphs merged/split as needed
 */
export function mergeSpanStripParagraphs(children: Element[]): Element[] {
  // First pass: split paragraphs at _splitByBlankLine markers and empty expr
  const expandedChildren: Element[] = [];
  for (const child of children) {
    if (isContainer(child, "paragraph")) {
      const data = getContainerData(child);
      if (data && data.elements.some(isSplitSpan)) {
        expandedChildren.push(...splitParagraphAtBlankLineSpans(child));
      } else if (data && data.elements.some(isEmptyExpr)) {
        expandedChildren.push(...splitParagraphAtEmptyExpr(child));
      } else {
        expandedChildren.push(child);
      }
    } else {
      expandedChildren.push(child);
    }
  }

  // Second pass: merge span_ paragraphs and unwrap them (no <p> tag)
  // span_ removes paragraph boundaries, so merged content becomes top-level elements
  const result: Element[] = [];
  let i = 0;

  while (i < expandedChildren.length) {
    const node = expandedChildren[i];

    // Only process paragraphs
    if (!node || !isContainer(node, "paragraph")) {
      if (node) result.push(node);
      i++;
      continue;
    }

    // Check if THIS paragraph contains span_
    const thisHasSpanStrip = hasParagraphStripSpan(node);

    // If this paragraph doesn't have span_, just output as normal paragraph
    if (!thisHasSpanStrip) {
      result.push(node);
      i++;
      continue;
    }

    // Start merging: collect elements from current and subsequent paragraphs
    const paraData = getContainerData(node);
    if (!paraData) {
      result.push(node);
      i++;
      continue;
    }
    const mergedChildren: Element[] = [...paraData.elements];
    i++;

    // Continue merging subsequent paragraphs
    while (i < expandedChildren.length) {
      const nextPara = expandedChildren[i];
      if (!nextPara || !isContainer(nextPara, "paragraph")) {
        break;
      }

      const nextParaData = getContainerData(nextPara);
      if (!nextParaData) {
        break;
      }

      const hasSpanStrip = hasParagraphStripSpan(nextPara);

      // Merge: add the next paragraph's children
      mergedChildren.push(...nextParaData.elements);
      i++;

      // If this paragraph doesn't have span_, check if the next one does
      // If not, stop merging
      if (!hasSpanStrip) {
        const peekNext = expandedChildren[i];
        if (!peekNext || !isContainer(peekNext, "paragraph") || !hasParagraphStripSpan(peekNext)) {
          break;
        }
      }
    }

    // Extract escaped spans (content after blank line in span_)
    // These go outside the merged content
    const escapedSpans = extractEscapedSpans(mergedChildren);

    // Remove line-breaks that are adjacent to span_ elements
    removeLineBreaksAroundSpanStrip(mergedChildren);

    // If there are escaped spans, wrap the main content in a paragraph
    // This is because escaped spans split the content, and the main part needs <p>
    // If no escaped spans, unwrap (no <p> tag) - span_ removes paragraph boundaries
    if (escapedSpans.length > 0) {
      // Wrap main content in paragraph
      if (mergedChildren.length > 0) {
        const para: Element = {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: mergedChildren,
          },
        };
        result.push(para);
      }
    } else {
      // UNWRAP: push merged children directly (no paragraph wrapper = no <p> tag)
      for (const child of mergedChildren) {
        result.push(child);
      }
    }

    // Add escaped spans as top-level spans (outside paragraph)
    for (const span of escapedSpans) {
      result.push(span);
    }
  }

  return result;
}

/**
 * Recursively remove internal flags from AST elements and clean up empty spans.
 *
 * During parsing, elements are annotated with internal flags like `_paragraphStrip`,
 * `_emptyParagraphStrip`, `_escapedFromParagraph`, and `_splitByBlankLine`. These
 * flags serve as inter-pass communication and must be stripped before the AST is
 * returned to callers.
 *
 * Additionally, empty `[[span]][[/span]]` elements and their adjacent whitespace
 * text nodes are removed. Wikidot renders empty spans as no output, so they and
 * their surrounding whitespace should not appear in the final AST.
 *
 * @param elements - Array of elements to clean
 * @returns New array with all internal flags removed and empty spans stripped
 */
export function cleanInternalFlags(elements: Element[]): Element[] {
  const cleaned = elements.map((el) => cleanElement(el));
  return removeEmptySpansAndAdjacentWhitespace(cleaned);
}

/**
 * Check if an element is a span container with no children.
 *
 * Empty `[[span]][[/span]]` produces no visible output in Wikidot and should
 * be removed from the AST along with surrounding whitespace.
 *
 * @param el - The element to check
 * @returns true if the element is a span container with an empty elements array
 */
function isEmptySpan(el: Element): boolean {
  if (el.element !== "container") return false;
  const data = el.data as ContainerData;
  return data.type === "span" && data.elements.length === 0;
}

/**
 * Check if an element is a text node containing only whitespace characters.
 *
 * @param el - The element to check
 * @returns true if the element is a text node whose data is entirely whitespace
 */
function isWhitespaceText(el: Element): boolean {
  return el.element === "text" && typeof el.data === "string" && /^\s+$/.test(el.data);
}

/**
 * Remove empty span elements and their adjacent whitespace text nodes.
 *
 * When an empty span is found, whitespace immediately before it is removed
 * (popped from the result), and whitespace immediately after it is skipped
 * (by advancing the index). This prevents orphaned whitespace from appearing
 * where the empty span was.
 *
 * @param elements - Array of elements to filter
 * @returns New array with empty spans and their adjacent whitespace removed
 */
function removeEmptySpansAndAdjacentWhitespace(elements: Element[]): Element[] {
  const result: Element[] = [];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!el) continue;

    if (isEmptySpan(el)) {
      // Remove whitespace before empty span
      if (result.length > 0 && isWhitespaceText(result[result.length - 1]!)) {
        result.pop();
      }
      // Skip whitespace after empty span (by looking ahead)
      while (i + 1 < elements.length && elements[i + 1] && isWhitespaceText(elements[i + 1]!)) {
        i++;
      }
      continue;
    }

    result.push(el);
  }

  return result;
}

/**
 * Clean a single element by removing internal flags and recursively cleaning children.
 *
 * For container elements, a new ContainerData is created without internal flag properties.
 * For line-break elements, all extra properties are stripped. For lists and definition
 * lists, items are recursively cleaned.
 *
 * @param el - The element to clean
 * @returns A new element with internal flags removed
 */
function cleanElement(el: Element): Element {
  // Remove internal flags from line-break elements
  if (el.element === "line-break") {
    return { element: "line-break" };
  }

  if (el.element === "container") {
    const data = el.data as ContainerData;

    // Create new data without internal flags
    const cleanedData: ContainerData = {
      type: data.type,
      attributes: data.attributes,
      elements: cleanInternalFlags(data.elements),
    };

    return {
      element: "container",
      data: cleanedData,
    };
  }

  if (el.element === "collapsible") {
    return {
      element: "collapsible",
      data: {
        ...el.data,
        elements: cleanInternalFlags(el.data.elements),
      },
    };
  }

  if (el.element === "color") {
    return {
      element: "color",
      data: {
        ...el.data,
        elements: cleanInternalFlags(el.data.elements),
      },
    };
  }

  // Clean list items recursively
  if (el.element === "list") {
    const data = el.data as any;
    return {
      element: "list",
      data: {
        ...data,
        items: data.items.map((item: any) => {
          if (item["item-type"] === "elements") {
            return {
              ...item,
              elements: cleanInternalFlags(item.elements),
            };
          } else if (item["item-type"] === "sub-list") {
            // Recursively clean the nested list
            const cleanedList = cleanElement({ element: "list", data: item.data } as Element);
            return {
              "item-type": "sub-list",
              element: "list",
              data: "data" in cleanedList ? cleanedList.data : item.data,
            };
          }
          return item;
        }),
      },
    };
  }

  // Clean definition-list items recursively
  if (el.element === "definition-list") {
    const items = el.data as any[];
    return {
      element: "definition-list",
      data: items.map((item: any) => ({
        ...item,
        key: cleanInternalFlags(item.key),
        value: cleanInternalFlags(item.value),
      })),
    };
  }

  return el;
}
