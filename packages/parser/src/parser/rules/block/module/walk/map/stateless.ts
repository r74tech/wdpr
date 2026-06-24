import type { Element } from "@wdprlib/ast";
import { getGenericElementChildren, withGenericElementChildren } from "../children";
import { mapDefinitionListItems } from "./stateless-definition-list";
import { mapListItems } from "./stateless-list";
import { mapTableRows } from "./stateless-table";
import { mapTabs } from "./stateless-tabs";

/**
 * Create a new element with all child element arrays transformed by a function.
 */
export function mapElementChildren(
  element: Element,
  transform: (elements: Element[]) => Element[],
): Element {
  if (element.element === "list") {
    return {
      element: "list",
      data: {
        ...element.data,
        items: mapListItems(element.data.items, transform),
      },
    };
  }

  if (element.element === "table") {
    return {
      element: "table",
      data: {
        ...element.data,
        rows: mapTableRows(element.data.rows, transform),
      },
    };
  }

  if (element.element === "definition-list") {
    return {
      element: "definition-list",
      data: mapDefinitionListItems(element.data, transform),
    };
  }

  if (element.element === "tab-view") {
    return {
      element: "tab-view",
      data: mapTabs(element.data, transform),
    };
  }

  const children = getGenericElementChildren(element);
  return children === null ? element : withGenericElementChildren(element, transform(children));
}
