import type { Element } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderElements } from "../../render";

/**
 * Render a branch's elements, trimming trailing whitespace-only text nodes.
 *
 * Wikidot strips trailing whitespace from `#if` / `#ifexpr` branch output.
 *
 * @param ctx - The current render context.
 * @param elements - The branch's element array.
 */
export function renderBranchElements(ctx: RenderContext, elements: Element[]): void {
  renderElements(ctx, elements.slice(0, findBranchRenderLength(elements)));
}

function findBranchRenderLength(elements: Element[]): number {
  let lastIdx = elements.length - 1;
  while (lastIdx >= 0 && isWhitespaceText(elements[lastIdx]!)) {
    lastIdx--;
  }
  return lastIdx + 1;
}

function isWhitespaceText(element: Element): boolean {
  return (
    element.element === "text" && typeof element.data === "string" && element.data.trim() === ""
  );
}
