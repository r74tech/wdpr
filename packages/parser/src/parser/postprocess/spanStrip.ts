/**
 * Post-processing for parsed AST
 *
 * Handles span_ (paragraph strip) paragraph merging
 * Handles empty expr splitting paragraphs
 */
import type { Element, ContainerData, ExprData } from "@wdprlib/ast";

/**
 * Check if an element is a container with specific type
 */
function isContainer(el: Element, type: string): boolean {
  if (el.element !== "container") return false;
  const data = el.data as ContainerData;
  return data.type === type;
}

/**
 * Get container data from element
 */
function getContainerData(el: Element): ContainerData | null {
  if (el.element !== "container") return null;
  return el.data as ContainerData;
}

/**
 * Check if a node is a span_ marker (paragraph strip)
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
 * Check if a paragraph contains a span with _paragraphStrip marker
 */
function hasParagraphStripSpan(para: Element): boolean {
  const data = getContainerData(para);
  if (!data || data.type !== "paragraph") return false;
  return data.elements.some((child) => isSpanStripMarker(child));
}

/**
 * Check if an element is an escaped span (content after blank line in span_)
 */
function isEscapedSpan(el: Element): boolean {
  if (el.element !== "container") return false;
  const data = el.data as ContainerData & { _escapedFromParagraph?: boolean };
  return data.type === "span" && data._escapedFromParagraph === true;
}

/**
 * Extract escaped spans from paragraph children and return them as separate spans
 * Also removes escaped spans AND everything after them from the original array
 *
 * Wikidot behavior: once an escaped span appears, everything after it is also
 * outside the paragraph.
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
 * Remove line-breaks that are adjacent to span_ elements and remove empty span_ markers
 * Wikidot behavior: span_ removes paragraph breaks, including line-breaks between merged paragraphs
 *
 * Uses single reverse pass to avoid multiple splice operations
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
 * Check if an element is a span split by blank line (needs separate paragraph)
 */
function isSplitSpan(el: Element): boolean {
  if (el.element !== "container") return false;
  const data = el.data as ContainerData;
  return data.type === "span" && data._splitByBlankLine === true;
}

/**
 * Split paragraph at spans marked with _splitByBlankLine
 * Returns array of paragraphs (original split into multiple)
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
 * Check if an element is an empty expr (expression is empty string)
 */
function isEmptyExpr(el: Element): boolean {
  if (el.element !== "expr") return false;
  const data = el.data as ExprData;
  return data.expression === "";
}

/**
 * Split paragraph at empty expr elements
 * Empty expr acts as a paragraph break
 * Returns array of paragraphs (original may be split into multiple)
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
 * Merge consecutive paragraphs that contain span_ (paragraph strip mode)
 * Wikidot behavior: span_ removes paragraph breaks around it
 *
 * When a paragraph contains span_, it becomes a "merge anchor" that can absorb
 * adjacent paragraphs (even those without span_).
 *
 * Escaped spans (content after blank line in span_) are extracted and placed
 * outside the paragraph.
 *
 * Also splits paragraphs containing spans with _splitByBlankLine marker.
 * Also splits paragraphs at empty [[#expr ]] elements.
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
 * Remove internal flags from AST elements recursively
 * These flags are used during parsing but should not appear in the output
 * Also removes empty spans and adjacent whitespace (Wikidot behavior: empty [[span]][[/span]] produces no output)
 */
export function cleanInternalFlags(elements: Element[]): Element[] {
  const cleaned = elements.map((el) => cleanElement(el));
  return removeEmptySpansAndAdjacentWhitespace(cleaned);
}

/**
 * Check if an element is an empty span (should be removed from output)
 */
function isEmptySpan(el: Element): boolean {
  if (el.element !== "container") return false;
  const data = el.data as ContainerData;
  return data.type === "span" && data.elements.length === 0;
}

/**
 * Check if an element is a whitespace-only text node
 */
function isWhitespaceText(el: Element): boolean {
  return el.element === "text" && typeof el.data === "string" && /^\s+$/.test(el.data);
}

/**
 * Remove empty spans and adjacent whitespace text nodes
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
 * Clean a single element and its children
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
              data: cleanedList.data,
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
