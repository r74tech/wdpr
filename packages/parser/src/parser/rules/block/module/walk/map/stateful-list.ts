import type { Element, ListItem } from "@wdprlib/ast";
import { listElement } from "../children";
import type { StatefulTransformResult } from "./types";

export function mapListItemsWithState<S>(
  items: ListItem[],
  state: S,
  transform: (elements: Element[], state: S) => StatefulTransformResult<S>,
): { items: ListItem[]; state: S } {
  const newItems: ListItem[] = [];
  let currentState = state;

  for (const item of items) {
    if (item["item-type"] === "elements") {
      const result = transform(item.elements, currentState);
      newItems.push({
        "item-type": "elements",
        attributes: item.attributes,
        elements: result.elements,
      });
      currentState = result.state;
      continue;
    }

    const result = transform([listElement(item.data)], currentState);
    const resolvedList = result.elements[0];
    if (resolvedList?.element === "list") {
      newItems.push({
        "item-type": "sub-list",
        element: "list",
        data: resolvedList.data,
      });
    } else {
      newItems.push(item);
    }
    currentState = result.state;
  }

  return { items: newItems, state: currentState };
}
