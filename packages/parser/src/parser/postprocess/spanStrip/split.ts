import type { Element } from "@wdprlib/ast";
import { paragraphElement } from "./factory";
import { getContainerData, isEmptyExpr, isSplitSpan } from "./predicates";

export function splitParagraphAtBlankLineSpans(para: Element): Element[] {
  const data = getContainerData(para);
  if (!data || data.type !== "paragraph") return [para];

  const result: Element[] = [];
  let currentElements: Element[] = [];

  for (const child of data.elements) {
    if (isSplitSpan(child)) {
      if (currentElements.length > 0) {
        result.push(paragraphElement(currentElements));
        currentElements = [];
      }
      currentElements.push(child);
    } else {
      currentElements.push(child);
    }
  }

  if (currentElements.length > 0) {
    result.push(paragraphElement(currentElements));
  }

  return result.length > 0 ? result : [para];
}

export function splitParagraphAtEmptyExpr(para: Element): Element[] {
  const data = getContainerData(para);
  if (!data || data.type !== "paragraph") return [para];
  if (!data.elements.some(isEmptyExpr)) return [para];

  const result: Element[] = [];
  let currentElements: Element[] = [];

  for (let i = 0; i < data.elements.length; i++) {
    const child = data.elements[i];
    if (!child) continue;

    if (isEmptyExpr(child)) {
      if (
        currentElements.length > 0 &&
        currentElements[currentElements.length - 1]?.element === "line-break"
      ) {
        currentElements.pop();
      }
      if (currentElements.length > 0) {
        result.push(paragraphElement(currentElements));
        currentElements = [];
      }
      if (i + 1 < data.elements.length && data.elements[i + 1]?.element === "line-break") {
        i++;
      }
    } else {
      currentElements.push(child);
    }
  }

  if (currentElements.length > 0) {
    result.push(paragraphElement(currentElements));
  }

  return result.length > 0 ? result : [];
}
