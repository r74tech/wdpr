import type { Element } from "@wdprlib/ast";
import { getGenericElementChildren, withGenericElementChildren } from "../children";
import { mapDefinitionListItemsWithState } from "./stateful-definition-list";
import { mapListItemsWithState } from "./stateful-list";
import { mapTableRowsWithState } from "./stateful-table";
import { mapTabsWithState } from "./stateful-tabs";
import type { StatefulTransformResult } from "./types";

/**
 * Create a new element with all child arrays transformed by a stateful function.
 */
export function mapElementChildrenWithState<S>(
  element: Element,
  state: S,
  transform: (elements: Element[], state: S) => StatefulTransformResult<S>,
): { element: Element; state: S } {
  if (element.element === "list") {
    const result = mapListItemsWithState(element.data.items, state, transform);
    return {
      element: {
        element: "list",
        data: { ...element.data, items: result.items },
      },
      state: result.state,
    };
  }

  if (element.element === "table") {
    const result = mapTableRowsWithState(element.data.rows, state, transform);
    return {
      element: {
        element: "table",
        data: { ...element.data, rows: result.rows },
      },
      state: result.state,
    };
  }

  if (element.element === "definition-list") {
    const result = mapDefinitionListItemsWithState(element.data, state, transform);
    return {
      element: {
        element: "definition-list",
        data: result.items,
      },
      state: result.state,
    };
  }

  if (element.element === "tab-view") {
    const result = mapTabsWithState(element.data, state, transform);
    return {
      element: {
        element: "tab-view",
        data: result.tabs,
      },
      state: result.state,
    };
  }

  const children = getGenericElementChildren(element);
  if (children === null) {
    return { element, state };
  }

  const result = transform(children, state);
  return {
    element: withGenericElementChildren(element, result.elements),
    state: result.state,
  };
}
