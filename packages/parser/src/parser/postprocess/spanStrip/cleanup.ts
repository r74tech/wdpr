import type { Element } from "@wdprlib/ast";
import { cleanElement } from "./clean-element";
import { removeEmptySpansAndAdjacentWhitespace } from "./empty-spans";

/**
 * Recursively remove internal flags from AST elements and clean up empty spans.
 */
export function cleanInternalFlags(elements: Element[]): Element[] {
  let cleaned: Element[] | null = null;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!el) continue;

    const next = cleanElement(el, cleanInternalFlags);
    if (cleaned !== null) {
      cleaned.push(next);
    } else if (next !== el) {
      cleaned = elements.slice(0, i);
      cleaned.push(next);
    }
  }

  return removeEmptySpansAndAdjacentWhitespace(cleaned ?? elements);
}
