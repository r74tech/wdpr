/**
 *
 * Post-processing pass: suppress paragraph wrapping adjacent to div containers.
 *
 * In Wikidot, when a paragraph is a direct sibling of a `<div>` block (no other
 * block elements between them), the `<p>` wrapping is removed and the inner
 * elements are promoted to the parent level.
 *
 * When the unwrapped paragraph follows a div, a line-break element is prepended
 * to represent the newline between the closing `</div>` and the bare text.
 *
 * Examples:
 *   `[[div]]inline[[/div]]\n[[div]]\n[[/div]]`  → no `<p>` (adjacent to div)
 *   `[[div]]inline[[/div]]\n> a\n[[div]]\n[[/div]]` → has `<p>` (blockquote between)
 *
 * @module
 */
import type { Element, ContainerData } from "@wdprlib/ast";

function isParagraphContainer(el: Element | undefined): boolean {
  if (!el || el.element !== "container") return false;
  return (el.data as ContainerData).type === "paragraph";
}

function isDivContainer(el: Element | undefined): boolean {
  if (!el || el.element !== "container") return false;
  return (el.data as ContainerData).type === "div";
}

/**
 * At a single nesting level, unwrap paragraph containers that are directly
 * adjacent to div containers. A line-break is prepended when the paragraph
 * follows a div.
 */
function suppressAtLevel(elements: Element[]): Element[] {
  if (elements.length <= 1) return elements;

  const unwrap = Array.from({ length: elements.length }, () => false);

  for (let i = 0; i < elements.length; i++) {
    if (!isParagraphContainer(elements[i])) continue;
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
 * Suppress paragraph wrapping adjacent to div containers.
 *
 * Applied only at the top level. Inside div containers, paragraphs adjacent
 * to nested divs retain their `<p>` wrapping (matching Wikidot behavior).
 */
export function suppressDivAdjacentParagraphs(elements: Element[]): Element[] {
  return suppressAtLevel(elements);
}
