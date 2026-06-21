import type { Element } from "@wdprlib/ast";

/**
 * Recursively extracts plain text from heading children for TOC entries.
 */
export function extractHeadingText(elements: Element[]): string {
  let text = "";
  for (const el of elements) {
    if (el.element === "text" && typeof el.data === "string") {
      text += el.data;
    } else if (hasNestedElements(el)) {
      text += extractHeadingText(el.data.elements);
    }
  }
  return text;
}

function hasNestedElements(el: Element): el is Extract<Element, { element: "container" }> {
  return (
    el.element === "container" &&
    typeof el.data === "object" &&
    el.data !== null &&
    "elements" in el.data &&
    Array.isArray(el.data.elements)
  );
}
