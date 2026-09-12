import type { Element } from "@wdprlib/ast";

/** Wikidot leaves the initial footnote paragraph unwrapped unless a blank line precedes it. */
export function buildFootnoteChildren(
  elements: Element[],
  leadingParagraphBreak: boolean,
): Element[] {
  const first = elements[0];
  if (!leadingParagraphBreak && first?.element === "container" && first.data.type === "paragraph") {
    return [...first.data.elements, ...elements.slice(1)];
  }
  return elements;
}
