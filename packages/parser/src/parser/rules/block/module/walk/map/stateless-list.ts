import type { Element, ListItem } from "@wdprlib/ast";
import { listElement } from "../children";

export function mapListItems(
  items: ListItem[],
  transform: (elements: Element[]) => Element[],
): ListItem[] {
  return items.map((item) => {
    if (item["item-type"] === "elements") {
      return {
        "item-type": "elements",
        attributes: item.attributes,
        elements: transform(item.elements),
      };
    }

    const subListResult = transform([listElement(item.data)]);
    const resolvedList = subListResult[0];
    if (resolvedList?.element !== "list") {
      return item;
    }

    return {
      "item-type": "sub-list",
      element: "list",
      data: resolvedList.data,
    };
  });
}
