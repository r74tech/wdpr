import type { Element } from "@wdprlib/ast";

export function trimTextElements(elements: Element[]): Element[] {
  if (elements.length === 0) return elements;

  let start = 0;
  let end = elements.length;

  while (start < end) {
    const el = elements[start]!;
    if (el.element === "text" && typeof el.data === "string" && el.data.trim() === "") {
      start++;
    } else {
      break;
    }
  }

  while (end > start) {
    const el = elements[end - 1]!;
    if (el.element === "text" && typeof el.data === "string" && el.data.trim() === "") {
      end--;
    } else {
      break;
    }
  }

  if (start === 0 && end === elements.length) return elements;
  return elements.slice(start, end);
}

export function hasNonWhitespaceElement(elements: Element[]): boolean {
  for (const el of elements) {
    if (el.element !== "text" || typeof el.data !== "string" || el.data.trim() !== "") {
      return true;
    }
  }
  return false;
}
