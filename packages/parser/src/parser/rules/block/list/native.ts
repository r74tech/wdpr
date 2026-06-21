import type { Element, ListData, ListItem, ListType } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { processDepths, type DepthList } from "../../../depth";
import { parseNativeListLine, type InternalListType, type ParsedListLine } from "./line";

/**
 * Default list type used as the top-level placeholder in
 * `processDepths()`. The actual type of each sub-list is determined
 * by its first item's marker.
 */
const GENERIC_LIST_TYPE: InternalListType = "bullet";

export interface ParsedNativeList {
  lines: ParsedListLine[];
  consumed: number;
}

export function collectNativeListLines(ctx: ParseContext): ParsedNativeList {
  const lines: ParsedListLine[] = [];
  let pos = ctx.pos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const result = parseNativeListLine(ctx, pos);
    if (result.kind === "stop") break;

    lines.push(result.line);
    pos += result.consumed;
    consumed += result.consumed;
  }

  return { lines, consumed };
}

export function buildNativeListElements(lines: ParsedListLine[]): Element[] {
  const depthTrees = processDepths<InternalListType, Element[]>(
    GENERIC_LIST_TYPE,
    lines,
    (a, b) => a === b,
  );

  return depthTrees.map(({ ltype, list }) => buildListElement(ltype, list));
}

/**
 * Converts the internal list type enum to the AST's ListType.
 */
function toListType(ltype: InternalListType): ListType {
  return ltype === "numbered" ? "numbered" : "bullet";
}

function buildListElement(
  topLtype: InternalListType,
  list: DepthList<InternalListType, Element[]>,
): Element {
  return {
    element: "list",
    data: buildListData(topLtype, list),
  };
}

function buildListData(
  topLtype: InternalListType,
  list: DepthList<InternalListType, Element[]>,
): ListData {
  const items: ListItem[] = [];

  for (const item of list) {
    if (item.kind === "item") {
      items.push({
        "item-type": "elements",
        attributes: {},
        elements: item.value,
      });
    } else {
      items.push({
        "item-type": "sub-list",
        element: "list",
        data: buildListData(item.ltype, item.children),
      });
    }
  }

  return {
    type: toListType(topLtype),
    attributes: {},
    items,
  };
}
