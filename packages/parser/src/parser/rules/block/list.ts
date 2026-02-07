/**
 *
 * Block rule for Wikidot marker-based lists (`* item`, `# item`).
 *
 * Wikidot lists use leading `*` (bullet) or `#` (numbered) markers at the
 * start of a line. Nesting is achieved by prepending spaces:
 *
 * ```
 * * Item 1
 *  * Nested bullet
 *  # Nested numbered
 * * Item 2
 * ```
 *
 * The depth of each item is determined by the number of leading spaces
 * before the marker. Mixed bullet/numbered lists are supported: when the
 * list type changes at the same depth, a new sub-list is created.
 *
 * The flat depth-annotated items are converted into a recursive tree by
 * {@link processDepths}, then transformed into nested `list` AST elements
 * by {@link buildListElement}.
 *
 * Maximum nesting depth is capped at {@link MAX_LIST_DEPTH} (20).
 *
 * @module
 */
import type { Element, ListData, ListItem, ListType } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseInlineUntil } from "../inline/utils";
import { processDepths, type DepthList } from "../../depth";

/**
 * Safety limit for list nesting depth.
 * Items deeper than this are not parsed, preventing stack overflow on
 * deeply nested or adversarial input.
 */
const MAX_LIST_DEPTH = 20;

/** Internal discriminated type for bullet vs numbered items during parsing. */
type InternalListType = "bullet" | "numbered";

/**
 * Default list type used as the top-level placeholder in
 * {@link processDepths}. The actual type of each sub-list is determined
 * by its first item's marker.
 */
const GENERIC_LIST_TYPE: InternalListType = "bullet";

/**
 * Block rule for marker-based lists (`* ` bullet, `# ` numbered).
 *
 * Parsing strategy:
 * 1. Verify the first token is LIST_BULLET or LIST_NUMBER at line start.
 * 2. Collect consecutive list lines, recording each item's depth (number
 *    of leading spaces), type (bullet/numbered), and inline content.
 * 3. Feed the flat depth array into {@link processDepths} with type
 *    comparison, producing a nested tree.
 * 4. Convert the tree into `list` AST elements via {@link buildListElement}.
 */
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
 * Converts the internal list type enum to the AST's {@link ListType}.
 *
 * @param ltype - Internal "bullet" or "numbered".
 * @returns The corresponding AST list type.
 */
function toListType(ltype: InternalListType): ListType {
  return ltype === "numbered" ? "numbered" : "bullet";
}

/**
 * Builds a `list` AST element from a depth tree produced by
 * {@link processDepths}.
 *
 * @param topLtype - The list type for the top-level list.
 * @param list     - The depth tree of items and sub-lists.
 * @returns A `list` element.
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
 * Recursively builds the {@link ListData} payload from a depth tree.
 *
 * Leaf items become `"elements"` list items; nested sub-trees become
 * `"sub-list"` items with their own recursive {@link ListData}.
 *
 * @param topLtype - List type for this level.
 * @param list     - The depth tree nodes at this level.
 * @returns Fully constructed {@link ListData}.
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
