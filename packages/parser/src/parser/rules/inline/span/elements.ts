import type { Element } from "@wdprlib/ast";
import type { SpanContent } from "./content";
import type { SpanBlockName } from "./syntax";

export function buildSpanElements(
  blockName: SpanBlockName,
  attributes: Record<string, string>,
  content: SpanContent,
): Element[] {
  if (blockName === "span_") {
    return buildParagraphStripSpans(attributes, content.children, content.escapedChildren);
  }

  if (content.splitSpans.length > 0) {
    return buildSplitSpans(attributes, content.children, content.splitSpans);
  }

  return [
    {
      element: "container",
      data: {
        type: "span",
        attributes,
        elements: content.children,
      },
    },
  ];
}

function buildParagraphStripSpans(
  attributes: Record<string, string>,
  children: Element[],
  escapedChildren: Element[],
): Element[] {
  trimEdgeLineBreaks(children);
  trimEdgeLineBreaks(escapedChildren);

  const elements: Element[] = [];

  if (children.length > 0) {
    elements.push({
      element: "container",
      data: {
        type: "span",
        attributes,
        elements: children,
        _paragraphStrip: true,
      },
    });
  }

  if (escapedChildren.length > 0) {
    elements.push({
      element: "container",
      data: {
        type: "span",
        attributes: {},
        elements: escapedChildren,
        _escapedFromParagraph: true,
      },
    });
  }

  if (elements.length === 0) {
    return [
      {
        element: "container",
        data: {
          type: "span",
          attributes: {},
          elements: [],
          _emptyParagraphStrip: true,
        },
      },
    ];
  }

  return elements;
}

function buildSplitSpans(
  attributes: Record<string, string>,
  children: Element[],
  splitSpans: Element[][],
): Element[] {
  if (children.length > 0) {
    splitSpans.push(children);
  }

  return splitSpans.map((segment, index) => ({
    element: "container" as const,
    data: {
      type: "span" as const,
      attributes: index === 0 ? attributes : {},
      elements: segment,
      _splitByBlankLine: index > 0,
    },
  }));
}

function trimEdgeLineBreaks(elements: Element[]): void {
  while (elements.length > 0 && elements[0]?.element === "line-break") {
    elements.shift();
  }
  while (elements.length > 0 && elements[elements.length - 1]?.element === "line-break") {
    elements.pop();
  }
}
