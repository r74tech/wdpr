/**
 *
 * Table of Contents (TOC) generation for Wikidot markup.
 *
 * Converts a flat array of `TocEntry` items (collected from heading elements
 * during parsing) into nested bullet-list `Element` nodes suitable for rendering
 * as `[[toc]]`. Uses the depth module to transform flat heading levels (h1-h6)
 * into a properly nested list hierarchy.
 *
 * Each TOC entry becomes an anchor link (`#toc0`, `#toc1`, ...) pointing to the
 * corresponding heading in the rendered page, matching Wikidot's original
 * anchor naming scheme.
 *
 * @module
 */

import type { Element, TocEntry, ListItem } from "@wdprlib/ast";
import { processDepths, type DepthList, type DepthItem } from "./depth";

/**
 * Sequential counter for generating unique TOC anchor IDs.
 *
 * Wikidot assigns sequential `#toc0`, `#toc1`, ... anchors to headings in
 * document order. This class maintains a monotonically increasing counter
 * that is shared across all TOC trees to ensure globally unique anchors.
 */
class TocIndexer {
  private index = 0;

  /**
   * Returns the next sequential index and advances the counter.
   * @returns The current index value (0-based) before incrementing
   */
  next(): number {
    return this.index++;
  }
}

/**
 * Build a nested bullet-list Element from depth-processed TOC items.
 *
 * Each item in the depth list is converted to a `ListItem`, with nested lists
 * becoming sub-list items and leaf items becoming anchor links.
 *
 * @param indexer - Shared counter for generating sequential `#tocN` anchors
 * @param items - Depth-processed list of heading text strings
 * @returns A `list` Element with type "bullet" containing the TOC hierarchy
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
 * Build a single TOC list item from a depth item.
 *
 * For leaf items, creates an anchor link element with a `#tocN` href.
 * For nested list items, recursively builds a sub-list.
 *
 * @param indexer - Shared counter for generating sequential `#tocN` anchors
 * @param item - A single depth item (either a leaf heading or a nested list)
 * @returns A `ListItem` for inclusion in the TOC list
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
