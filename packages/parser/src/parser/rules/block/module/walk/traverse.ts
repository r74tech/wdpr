import type { Element } from "@wdprlib/ast";
import { getGenericElementChildren, listElement } from "./children";

/**
 * Walk all elements recursively in depth-first order, calling a callback for each.
 *
 * The callback is invoked for every element in the tree, including elements nested
 * inside lists, tables, definition lists, tab views, and any element with a
 * `data.elements` array. The callback is called before descending into children
 * (pre-order traversal).
 *
 * This is a read-only traversal; the callback cannot modify the tree structure.
 * Use `mapElementChildren` or `mapElementChildrenWithState` for transformations.
 *
 * @param elements - Array of elements to traverse
 * @param callback - Function called for each element encountered
 */
export function walkElements(elements: Element[], callback: (element: Element) => void): void {
  for (const element of elements) {
    callback(element);
    walkElementChildren(element, callback);
  }
}

function walkElementChildren(element: Element, callback: (element: Element) => void): void {
  if (element.element === "list") {
    for (const item of element.data.items) {
      if (item["item-type"] === "elements") {
        walkElements(item.elements, callback);
      } else if (item["item-type"] === "sub-list") {
        walkElements([listElement(item.data)], callback);
      }
    }
    return;
  }

  if (element.element === "table") {
    for (const row of element.data.rows) {
      for (const cell of row.cells) {
        walkElements(cell.elements, callback);
      }
    }
    return;
  }

  if (element.element === "definition-list") {
    for (const item of element.data) {
      walkElements(item.key, callback);
      walkElements(item.value, callback);
    }
    return;
  }

  if (element.element === "tab-view") {
    for (const tab of element.data) {
      walkElements(tab.elements, callback);
    }
    return;
  }

  const children = getGenericElementChildren(element);
  if (children !== null) {
    walkElements(children, callback);
  }
}
