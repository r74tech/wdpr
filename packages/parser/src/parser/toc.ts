/**
 * Table of Contents generation
 *
 * Converts flat TocEntry[] to nested List elements
 */

import type { Element, TocEntry, ListItem } from "@wdprlib/ast";
import { processDepths, type DepthList, type DepthItem } from "./depth";

/**
 * TOC index incrementer
 */
class TocIndexer {
  private index = 0;

  next(): number {
    return this.index++;
  }
}

/**
 * Build a nested List element from depth-processed items
 */
function buildTocList(indexer: TocIndexer, items: DepthList<null, string>): Element {
  const listItems: ListItem[] = items.map((item) => buildTocListItem(indexer, item));

  return {
    element: "list",
    data: {
      type: "bullet",
      attributes: {},
      items: listItems,
    },
  };
}

/**
 * Build a single list item from a depth item
 */
function buildTocListItem(indexer: TocIndexer, item: DepthItem<null, string>): ListItem {
  if (item.kind === "list") {
    return {
      "item-type": "sub-list",
      element: "list",
      data: {
        type: "bullet",
        attributes: {},
        items: item.children.map((child) => buildTocListItem(indexer, child)),
      },
    };
  }

  // item.kind === "item"
  const anchor = `#toc${indexer.next()}`;
  const linkElement: Element = {
    element: "link",
    data: {
      type: "table-of-contents",
      link: anchor,
      extra: null,
      label: { text: item.value },
      target: null,
    },
  };

  return {
    "item-type": "elements",
    attributes: {},
    elements: [linkElement],
  };
}

/**
 * Convert flat TocEntry[] to nested List elements
 *
 * @param entries - Flat list of TOC entries with level and text
 * @returns Array of List elements (usually one, but can be multiple if levels reset)
 */
export function buildTableOfContents(entries: TocEntry[]): Element[] {
  if (entries.length === 0) {
    return [];
  }

  // Convert entries to depth-annotated items
  // level is 1-based (h1=1, h2=2, ...), convert to 0-based depth
  const depthItems = entries.map((entry) => ({
    depth: entry.level - 1,
    ltype: null as null, // We don't differentiate list types for TOC
    value: entry.text,
  }));

  // Process into nested structure
  const trees = processDepths<null, string>(null, depthItems);

  // Build List elements from each tree
  const indexer = new TocIndexer();
  return trees.map((tree) => buildTocList(indexer, tree.list));
}
