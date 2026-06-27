import type { Element } from "@wdprlib/ast";
import { walkElements } from "../rules/block/module/walk";

/**
 * Return `true` when an explicit `footnote-block` element exists anywhere
 * in the tree.
 *
 * Reuses the parser's general-purpose {@link walkElements} so descent
 * into containers, collapsibles, list items, table cells, tab panels,
 * definition lists, etc. matches the rest of the parser exactly.
 *
 * Note on `[[iftags]]`: the walker also descends into iftags bodies, so
 * a `[[footnoteblock]]` that only renders conditionally still suppresses
 * the auto-append. This matches the previous behaviour for unresolved
 * iftags but means the implicit block does not reappear if the iftags
 * condition evaluates to false during `resolveModules`. Tracked as a
 * known limitation; iftags preprocessing would fix it.
 */
export function containsFootnoteBlock(elements: Element[]): boolean {
  let found = false;
  walkElements(elements, (element) => {
    if (element.element === "footnote-block") found = true;
  });
  return found;
}
