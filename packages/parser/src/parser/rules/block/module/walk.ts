/**
 *
 * AST element traversal and transformation utilities.
 *
 * Provides shared logic for recursively visiting and transforming child elements
 * across all AST node types that contain nested elements. The AST has several
 * "special" structures (list, table, definition-list, tab-view) that store
 * children in type-specific locations, plus a generic pattern where elements
 * are stored in `data.elements`. These utilities abstract over those differences
 * so callers can focus on their transformation logic.
 *
 * Three main functions are provided:
 * - `walkElements` - Read-only traversal (visitor pattern)
 * - `mapElementChildren` - Stateless transformation of child arrays
 * - `mapElementChildrenWithState` - Stateful transformation with threaded state
 *
 * Used by the ListPages extraction, module resolution, and include resolution systems.
 *
 * @module
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
} from "@wdprlib/ast";

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
 * Create a new element with all child element arrays transformed by a function.
 *
 * This is a structural mapper that knows how to find child element arrays in all
 * AST node types (list items, table cells, definition list keys/values, tab panels,
 * and generic `data.elements`). The transform function receives each child array
 * and returns a new array; the original element is not mutated.
 *
 * If the element has no children, it is returned unchanged (same reference).
 *
 * @param element - The element whose children should be transformed
 * @param transform - Function that receives a child element array and returns a transformed array
 * @returns A new element with transformed children, or the original element if it has no children
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
 * Create a new element with all child arrays transformed by a stateful function.
 *
 * Like `mapElementChildren`, but the transform function also receives and returns
 * a state value. State is threaded sequentially through each child group: the output
 * state from one group becomes the input state for the next. This is useful when
 * the transformation needs to track information across sibling groups, such as
 * maintaining a monotonically increasing ID counter.
 *
 * @typeParam S - The type of the threaded state
 * @param element - The element whose children should be transformed
 * @param state - Initial state value
 * @param transform - Function that receives a child array and current state,
 *                    returning transformed elements and updated state
 * @returns Object with the new element and final state value
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
