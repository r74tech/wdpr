/**
 * Preserve the bare rendering of unparsed div syntax beside a valid div.
 * Ordinary paragraphs retain their wrappers, including beside div containers.
 */
import type { Element, ContainerData } from "@wdprlib/ast";

// Track the syntax node rather than its paragraph so splitting a paragraph
// cannot mark a separate fragment containing only ordinary text.
const unparsedDivStarts = new WeakSet<Element>();

export function markUnparsedDivStart(elements: Element[]): void {
  const first = elements[0];
  const text =
    first?.element === "container" && first.data.type === "paragraph"
      ? first.data.elements[0]
      : first;
  if (text?.element === "text") unparsedDivStarts.add(text);
}

function isUnparsedDivParagraph(el: Element | undefined): boolean {
  if (!el || el.element !== "container") return false;
  return (
    el.data.type === "paragraph" && el.data.elements.some((child) => unparsedDivStarts.has(child))
  );
}

function isDivContainer(el: Element | undefined): boolean {
  if (!el || el.element !== "container") return false;
  return (el.data as ContainerData).type === "div";
}

/**
 * At a single nesting level, unwrap paragraphs containing unparsed div syntax
 * that are directly adjacent to div containers. A line-break is prepended when the paragraph
 * follows a div.
 */
function suppressAtLevel(elements: Element[]): Element[] {
  if (elements.length <= 1) return elements;

  const unwrap = Array.from({ length: elements.length }, () => false);

  for (let i = 0; i < elements.length; i++) {
    if (!isUnparsedDivParagraph(elements[i])) continue;
    const prevIsDiv = i > 0 && isDivContainer(elements[i - 1]);
    const nextIsDiv = i < elements.length - 1 && isDivContainer(elements[i + 1]);
    if (prevIsDiv || nextIsDiv) {
      unwrap[i] = true;
    }
  }

  const result: Element[] = [];
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!el) continue;

    if (unwrap[i] && el.element === "container") {
      const inner = (el.data as ContainerData).elements;
      if (i > 0 && isDivContainer(elements[i - 1])) {
        result.push({ element: "line-break" });
      }
      result.push(...inner);
    } else {
      result.push(el);
    }
  }

  return result;
}

/**
 * Suppress wrapping of unparsed div syntax adjacent to div containers.
 *
 * Applied only at the top level. Inside div containers, paragraphs adjacent
 * to nested divs retain their `<p>` wrapping (matching Wikidot behavior).
 */
export function suppressDivAdjacentParagraphs(elements: Element[]): Element[] {
  return suppressAtLevel(elements);
}
