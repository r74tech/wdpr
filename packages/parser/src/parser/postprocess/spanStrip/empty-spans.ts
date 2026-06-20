import type { Element } from "@wdprlib/ast";
import { isEmptySpan, isWhitespaceText } from "./predicates";

export function removeEmptySpansAndAdjacentWhitespace(elements: Element[]): Element[] {
  let hasEmptySpan = false;
  for (const el of elements) {
    if (el && isEmptySpan(el)) {
      hasEmptySpan = true;
      break;
    }
  }
  if (!hasEmptySpan) {
    return elements;
  }

  const result: Element[] = [];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!el) continue;

    if (isEmptySpan(el)) {
      if (result.length > 0 && isWhitespaceText(result[result.length - 1]!)) {
        result.pop();
      }
      while (i + 1 < elements.length && elements[i + 1] && isWhitespaceText(elements[i + 1]!)) {
        i++;
      }
      continue;
    }

    result.push(el);
  }

  return result;
}
