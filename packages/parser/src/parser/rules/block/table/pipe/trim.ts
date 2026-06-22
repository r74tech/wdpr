import type { Element } from "@wdprlib/ast";

export function trimElements(elements: Element[]): Element[] {
  let start = 0;
  let end = elements.length;
  let firstReplacement: Element | null = null;
  let lastReplacement: Element | null = null;

  while (start < end) {
    const first = elements[start];
    if (first?.element !== "text" || typeof first.data !== "string") {
      break;
    }

    const trimmed = first.data.trimStart();
    if (trimmed === "") {
      start++;
    } else {
      firstReplacement = trimmed === first.data ? null : { element: "text", data: trimmed };
      break;
    }
  }

  while (start < end) {
    const last = elements[end - 1];
    if (last?.element !== "text" || typeof last.data !== "string") {
      break;
    }

    const trimmed = last.data.trimEnd();
    if (trimmed === "") {
      end--;
    } else {
      lastReplacement = trimmed === last.data ? null : { element: "text", data: trimmed };
      break;
    }
  }

  const result = elements.slice(start, end);
  if (result.length > 0) {
    if (firstReplacement) {
      result[0] = firstReplacement;
    }
    if (lastReplacement) {
      result[result.length - 1] = lastReplacement;
    }
  }

  return result;
}
