import type { Element } from "@wdprlib/ast";
import { processCloseSpanMarkers } from "./span-markers";
import { isPreservedLeadingLineBreak } from "../../inline/parsing/preserved-line-break";

type PreservedLineBreak = Extract<Element, { element: "line-break" }> & {
  _preservedTrailingBreak?: boolean;
};

export function normalizeParagraphElements(source: Element[]): Element[] {
  let elements = processCloseSpanMarkers(source);

  removeTrailingLineBreaks(elements);
  removeTrailingWhitespaceText(elements);
  elements = removeLeadingLineBreaks(elements);

  return elements;
}

function removeTrailingLineBreaks(elements: Element[]): void {
  while (elements.length > 0 && elements[elements.length - 1]?.element === "line-break") {
    const lastEl = elements[elements.length - 1] as PreservedLineBreak;
    if (lastEl._preservedTrailingBreak) {
      delete lastEl._preservedTrailingBreak;
      break;
    }
    elements.pop();
  }
}

function removeTrailingWhitespaceText(elements: Element[]): void {
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
}

function removeLeadingLineBreaks(elements: Element[]): Element[] {
  let first = 0;
  while (
    first < elements.length &&
    elements[first]?.element === "line-break" &&
    !isPreservedLeadingLineBreak(elements[first])
  ) {
    first++;
  }

  return first > 0 ? elements.slice(first) : elements;
}
