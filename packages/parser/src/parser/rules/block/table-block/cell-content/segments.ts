import type { Element } from "@wdprlib/ast";

export interface CellContentAccumulator {
  addInline(element: Element): void;
  addInlineElements(elements: Element[]): void;
  addBlockElements(elements: Element[]): void;
  addParagraphBreak(): void;
  closeInlineSegmentBeforeBlock(): void;
  isEmpty(): boolean;
  finish(): { elements: Element[]; hadParagraphBreaks: boolean };
}

export function createCellContentAccumulator(): CellContentAccumulator {
  const elements: Element[] = [];
  let currentSegment: Element[] = [];
  let hasMultipleParts = false;
  let hasBlockElement = false;
  let hadParagraphBreaks = false;

  const flushSegment = (wrapInParagraph: boolean) => {
    trimSegment(currentSegment);
    if (currentSegment.length === 0) return;

    if (wrapInParagraph) {
      elements.push({
        element: "container",
        data: {
          type: "paragraph",
          attributes: {},
          elements: [...currentSegment],
        },
      });
    } else {
      elements.push(...currentSegment);
    }
    currentSegment = [];
  };

  return {
    addInline(element: Element) {
      currentSegment.push(element);
    },
    addInlineElements(nextElements: Element[]) {
      currentSegment.push(...nextElements);
    },
    addBlockElements(blockElements: Element[]) {
      if (currentSegment.length > 0) {
        flushSegment(true);
        hasMultipleParts = true;
      }

      elements.push(...blockElements);
      hasBlockElement = true;
      hasMultipleParts = true;
    },
    addParagraphBreak() {
      flushSegment(true);
      hasMultipleParts = true;
      hadParagraphBreaks = true;
    },
    closeInlineSegmentBeforeBlock() {
      flushSegment(true);
      hasMultipleParts = true;
    },
    isEmpty() {
      return currentSegment.length === 0 && elements.length === 0;
    },
    finish() {
      flushSegment(hasMultipleParts || hasBlockElement);
      return { elements, hadParagraphBreaks };
    },
  };
}

export function unwrapSingleInlineParagraph(elements: Element[]): Element[] {
  if (elements.length !== 1) {
    return elements;
  }

  const first = elements[0];
  if (first?.element !== "container" || first.data.type !== "paragraph") {
    return elements;
  }

  const innerElements = first.data.elements;
  const hasBlockElement = innerElements.some((element) => isBlockElement(element));
  return hasBlockElement ? elements : innerElements;
}

function trimSegment(elements: Element[]): void {
  trimSegmentEnd(elements);
  trimSegmentStart(elements);
}

function trimSegmentEnd(elements: Element[]): void {
  while (elements.length > 0) {
    const last = elements[elements.length - 1];
    if (isBlankText(last) || last?.element === "line-break") {
      elements.pop();
      continue;
    }

    break;
  }
}

function trimSegmentStart(elements: Element[]): void {
  while (elements.length > 0 && isBlankText(elements[0])) {
    elements.shift();
  }
}

function isBlankText(element: Element | undefined): boolean {
  return element?.element === "text" && typeof element.data === "string" && element.data.trim() === "";
}

function isBlockElement(element: Element): boolean {
  switch (element.element) {
    case "table":
    case "code":
    case "list":
    case "iframe":
      return true;
  }

  return (
    element.element === "container" &&
    (element.data.type === "paragraph" ||
      element.data.type === "div" ||
      element.data.type === "blockquote")
  );
}
