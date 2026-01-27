/**
 * AST element traversal utilities
 *
 * Provides shared logic for traversing child elements of special structures
 * (list, table, definition-list, tab-view) and generic elements with data.elements.
 *
 * Used by:
 * - listpages/extract.ts (walkElements)
 * - resolve.ts (walkAndResolve, countListPagesInElements)
 * - include/resolve.ts (resolveElements)
 */

import type {
  Element,
  ListData,
  ListItem,
  TableData,
  TableRow,
  TableCell,
  DefinitionListItem,
  TabData,
} from "@wdpr/ast";

/**
 * Walk all elements recursively, calling callback for each element.
 *
 * Traverses special structures (list, table, definition-list, tab-view)
 * and generic elements with data.elements.
 */
export function walkElements(elements: Element[], callback: (element: Element) => void): void {
  for (const element of elements) {
    callback(element);

    // List
    if (element.element === "list") {
      const listData = element.data as ListData;
      for (const item of listData.items) {
        if (item["item-type"] === "elements") {
          walkElements(item.elements, callback);
        } else if (item["item-type"] === "sub-list") {
          walkElements([{ element: "list", data: item.data } as Element], callback);
        }
      }
      continue;
    }

    // Table
    if (element.element === "table") {
      const tableData = element.data as TableData;
      for (const row of tableData.rows) {
        for (const cell of row.cells) {
          walkElements(cell.elements, callback);
        }
      }
      continue;
    }

    // Definition list
    if (element.element === "definition-list") {
      const defListData = element.data as DefinitionListItem[];
      for (const item of defListData) {
        walkElements(item.key, callback);
        walkElements(item.value, callback);
      }
      continue;
    }

    // Tab view
    if (element.element === "tab-view") {
      const tabData = element.data as TabData[];
      for (const tab of tabData) {
        walkElements(tab.elements, callback);
      }
      continue;
    }

    // Generic elements with data.elements
    if ("data" in element && element.data && typeof element.data === "object") {
      const data = element.data as Record<string, unknown>;
      if ("elements" in data && Array.isArray(data.elements)) {
        walkElements(data.elements as Element[], callback);
      }
    }
  }
}

/**
 * Map child elements of a single element using a transform function.
 *
 * Returns a new element with all child element arrays transformed.
 * If the element has no children, returns it unchanged.
 *
 * The transform function receives child element arrays and returns
 * transformed arrays. This allows callers to apply their own resolution
 * logic without duplicating the structural traversal.
 */
export function mapElementChildren(
  element: Element,
  transform: (elements: Element[]) => Element[],
): Element {
  // List
  if (element.element === "list") {
    const listData = element.data as ListData;
    const newItems: ListItem[] = [];

    for (const item of listData.items) {
      if (item["item-type"] === "elements") {
        newItems.push({
          "item-type": "elements",
          attributes: item.attributes,
          elements: transform(item.elements),
        });
      } else if (item["item-type"] === "sub-list") {
        const subListResult = transform([{ element: "list", data: item.data } as Element]);
        const resolvedList = subListResult[0];
        if (resolvedList?.element === "list") {
          newItems.push({
            "item-type": "sub-list",
            element: "list",
            data: resolvedList.data as ListData,
          });
        } else {
          newItems.push(item);
        }
      }
    }

    return {
      element: "list",
      data: { ...listData, items: newItems },
    } as Element;
  }

  // Table
  if (element.element === "table") {
    const tableData = element.data as TableData;
    const newRows: TableRow[] = [];

    for (const row of tableData.rows) {
      const newCells: TableCell[] = [];
      for (const cell of row.cells) {
        newCells.push({ ...cell, elements: transform(cell.elements) });
      }
      newRows.push({ ...row, cells: newCells });
    }

    return {
      element: "table",
      data: { ...tableData, rows: newRows },
    } as Element;
  }

  // Definition list
  if (element.element === "definition-list") {
    const defListData = element.data as DefinitionListItem[];
    const newItems: DefinitionListItem[] = [];

    for (const item of defListData) {
      newItems.push({
        key_string: item.key_string,
        key: transform(item.key),
        value: transform(item.value),
      });
    }

    return {
      element: "definition-list",
      data: newItems,
    } as Element;
  }

  // Tab view
  if (element.element === "tab-view") {
    const tabData = element.data as TabData[];
    const newTabs: TabData[] = [];

    for (const tab of tabData) {
      newTabs.push({ ...tab, elements: transform(tab.elements) });
    }

    return {
      element: "tab-view",
      data: newTabs,
    } as Element;
  }

  // Generic elements with data.elements
  if ("data" in element && element.data && typeof element.data === "object") {
    const data = element.data as Record<string, unknown>;
    if ("elements" in data && Array.isArray(data.elements)) {
      return {
        ...element,
        data: {
          ...data,
          elements: transform(data.elements as Element[]),
        },
      } as Element;
    }
  }

  // No children
  return element;
}

/**
 * Map child elements with stateful transform.
 *
 * Like mapElementChildren but the transform function returns both
 * the transformed elements and updated state. State is threaded
 * through each child group sequentially.
 *
 * Used when traversal needs to accumulate state (e.g., ID counter).
 */
export function mapElementChildrenWithState<S>(
  element: Element,
  state: S,
  transform: (elements: Element[], state: S) => { elements: Element[]; state: S },
): { element: Element; state: S } {
  // List
  if (element.element === "list") {
    const listData = element.data as ListData;
    const newItems: ListItem[] = [];
    let currentState = state;

    for (const item of listData.items) {
      if (item["item-type"] === "elements") {
        const result = transform(item.elements, currentState);
        newItems.push({
          "item-type": "elements",
          attributes: item.attributes,
          elements: result.elements,
        });
        currentState = result.state;
      } else if (item["item-type"] === "sub-list") {
        const result = transform([{ element: "list", data: item.data } as Element], currentState);
        const resolvedList = result.elements[0];
        if (resolvedList?.element === "list") {
          newItems.push({
            "item-type": "sub-list",
            element: "list",
            data: resolvedList.data as ListData,
          });
        } else {
          newItems.push(item);
        }
        currentState = result.state;
      }
    }

    return {
      element: {
        element: "list",
        data: { ...listData, items: newItems },
      } as Element,
      state: currentState,
    };
  }

  // Table
  if (element.element === "table") {
    const tableData = element.data as TableData;
    const newRows: TableRow[] = [];
    let currentState = state;

    for (const row of tableData.rows) {
      const newCells: TableCell[] = [];
      for (const cell of row.cells) {
        const result = transform(cell.elements, currentState);
        newCells.push({ ...cell, elements: result.elements });
        currentState = result.state;
      }
      newRows.push({ ...row, cells: newCells });
    }

    return {
      element: {
        element: "table",
        data: { ...tableData, rows: newRows },
      } as Element,
      state: currentState,
    };
  }

  // Definition list
  if (element.element === "definition-list") {
    const defListData = element.data as DefinitionListItem[];
    const newItems: DefinitionListItem[] = [];
    let currentState = state;

    for (const item of defListData) {
      const keyResult = transform(item.key, currentState);
      currentState = keyResult.state;
      const valueResult = transform(item.value, currentState);
      currentState = valueResult.state;
      newItems.push({
        key_string: item.key_string,
        key: keyResult.elements,
        value: valueResult.elements,
      });
    }

    return {
      element: {
        element: "definition-list",
        data: newItems,
      } as Element,
      state: currentState,
    };
  }

  // Tab view
  if (element.element === "tab-view") {
    const tabData = element.data as TabData[];
    const newTabs: TabData[] = [];
    let currentState = state;

    for (const tab of tabData) {
      const result = transform(tab.elements, currentState);
      newTabs.push({ ...tab, elements: result.elements });
      currentState = result.state;
    }

    return {
      element: {
        element: "tab-view",
        data: newTabs,
      } as Element,
      state: currentState,
    };
  }

  // Generic elements with data.elements
  if ("data" in element && element.data && typeof element.data === "object") {
    const data = element.data as Record<string, unknown>;
    if ("elements" in data && Array.isArray(data.elements)) {
      const result = transform(data.elements as Element[], state);
      return {
        element: {
          ...element,
          data: {
            ...data,
            elements: result.elements,
          },
        } as Element,
        state: result.state,
      };
    }
  }

  // No children
  return { element, state };
}
