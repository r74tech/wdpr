import type { Element, ListData, ListItem, ListType } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseInlineUntil } from "../inline/utils";
import { processDepths, type DepthList } from "../../depth";

const MAX_LIST_DEPTH = 20;

// Internal list type for parsing
type InternalListType = "bullet" | "numbered";

// Dummy type to represent "generic" list type at top level
const GENERIC_LIST_TYPE: InternalListType = "bullet";

export const listRule: BlockRule = {
  name: "list",
  startTokens: ["LIST_BULLET", "LIST_NUMBER"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const firstToken = currentToken(ctx);

    if (!firstToken.lineStart) {
      return { success: false };
    }

    // Wikidot: list must start with list marker directly (no leading whitespace)
    if (firstToken.type !== "LIST_BULLET" && firstToken.type !== "LIST_NUMBER") {
      return { success: false };
    }

    // Collect depth-annotated items
    const depths: Array<{
      depth: number;
      ltype: InternalListType;
      value: Element[];
    }> = [];
    let pos = ctx.pos;
    let consumed = 0;

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];

      if (!token || !token.lineStart) {
        break;
      }

      // Determine depth from leading whitespace
      let depth = 0;
      if (token.type === "WHITESPACE") {
        // Count spaces for depth (each space is 1 level)
        depth = token.value.length;
        pos++;
        consumed++;
      }

      // Check for list marker
      const markerToken = ctx.tokens[pos];
      if (
        !markerToken ||
        (markerToken.type !== "LIST_BULLET" && markerToken.type !== "LIST_NUMBER")
      ) {
        // Undo whitespace consumption if not followed by list marker
        if (depth > 0) {
          pos--;
          consumed--;
        }
        break;
      }

      // Check maximum depth
      if (depth > MAX_LIST_DEPTH) {
        break;
      }

      // Get list type
      const ltype: InternalListType = markerToken.type === "LIST_BULLET" ? "bullet" : "numbered";

      // Skip marker
      pos++;
      consumed++;

      // Expect whitespace after marker
      if (ctx.tokens[pos]?.type === "WHITESPACE") {
        pos++;
        consumed++;
      }

      // Parse inline content until newline
      const inlineCtx: ParseContext = { ...ctx, pos };
      const inlineResult = parseInlineUntil(inlineCtx, "NEWLINE");
      const elements: Element[] = inlineResult.elements;
      consumed += inlineResult.consumed;
      pos += inlineResult.consumed;

      // Consume newline
      if (ctx.tokens[pos]?.type === "NEWLINE") {
        pos++;
        consumed++;
      }

      // Add to depths
      depths.push({
        depth,
        ltype,
        value: elements,
      });
    }

    // No items parsed - rule fails
    if (depths.length === 0) {
      return { success: false };
    }

    // Process depths with list type comparison
    const depthTrees = processDepths<InternalListType, Element[]>(
      GENERIC_LIST_TYPE,
      depths,
      (a, b) => a === b,
    );

    // Convert depth trees to list elements
    const lists = depthTrees.map(({ ltype, list }) => buildListElement(ltype, list));

    return {
      success: true,
      elements: lists,
      consumed,
    };
  },
};

/**
 * Convert internal list type to Wikidot ListType
 */
function toListType(ltype: InternalListType): ListType {
  return ltype === "numbered" ? "numbered" : "bullet";
}

/**
 * Build a List element from a depth list
 */
function buildListElement(
  topLtype: InternalListType,
  list: DepthList<InternalListType, Element[]>,
): Element {
  return {
    element: "list",
    data: buildListData(topLtype, list),
  };
}

/**
 * Build ListData from a depth list (for nested lists)
 */
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
