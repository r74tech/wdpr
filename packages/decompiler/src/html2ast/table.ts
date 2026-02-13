import type { Element, TableData, TableRow, TableCell, Alignment } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";
import { isTag } from "domhandler";
import type { DecompileContext } from "./context";
import type { ChildrenRecognizer } from "./types-internal";

/**
 * Recognize a `<table>` element as an AST table element.
 *
 * Handles `<thead>`, `<tbody>`, `<tfoot>` wrappers and bare `<tr>` rows.
 */
export function recognizeTable(
  node: DomElement,
  _ctx: DecompileContext,
  rec: ChildrenRecognizer,
): Element {
  const rows: TableRow[] = [];

  // Look inside <tbody>/<thead>/<tfoot> if present
  const rowContainers = findRowContainers(node);
  for (const container of rowContainers) {
    for (const child of container.childNodes) {
      if (!isTag(child) || child.name !== "tr") continue;
      rows.push(recognizeRow(child, rec));
    }
  }

  const data: TableData = {
    attributes: {},
    rows,
  };

  return { element: "table", data };
}

/**
 * Find the containers that hold `<tr>` rows.
 *
 * Returns `<thead>`, `<tbody>`, `<tfoot>` elements when present, or the
 * table element itself if rows are direct children.
 */
function findRowContainers(table: DomElement): DomElement[] {
  const containers: DomElement[] = [];
  for (const child of table.childNodes) {
    if (!isTag(child)) continue;
    if (child.name === "tbody" || child.name === "thead" || child.name === "tfoot") {
      containers.push(child);
    } else if (child.name === "tr") {
      containers.push(table);
      return containers;
    }
  }
  if (containers.length === 0) containers.push(table);
  return containers;
}

/** Recognize a `<tr>` element as a table row. */
function recognizeRow(node: DomElement, rec: ChildrenRecognizer): TableRow {
  const cells: TableCell[] = [];
  for (const child of node.childNodes) {
    if (!isTag(child)) continue;
    if (child.name === "td" || child.name === "th") {
      cells.push(recognizeCell(child, rec));
    }
  }
  return { attributes: {}, cells };
}

/** Recognize a `<td>` or `<th>` element as a table cell. */
function recognizeCell(node: DomElement, rec: ChildrenRecognizer): TableCell {
  const header = node.name === "th";
  const colspanStr = node.attribs.colspan;
  const columnSpan = colspanStr ? parseInt(colspanStr, 10) : 1;

  const style = node.attribs.style ?? "";
  const alignMatch = style.match(/text-align:\s*(left|right|center|justify)/);
  const align: Alignment | null = alignMatch ? (alignMatch[1] as Alignment) : null;

  const elements = rec(node);

  return {
    header,
    "column-span": columnSpan,
    align,
    attributes: {},
    elements,
  };
}
