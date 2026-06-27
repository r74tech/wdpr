import type { Element, ListData, ListItem } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBareListContent } from "./bare-content";
import { parseLiItem } from "./li-item";
import { parseListBlockOpen } from "./open";
import { consumeCloseTag, isListClose, isNestedListOpen, type ListBlockType } from "./tags";

/**
 * Parses a complete `[[ul]]...[[/ul]]` or `[[ol]]...[[/ol]]` block.
 */
export function parseListBlock(
  ctx: ParseContext,
  startPos: number,
  listType: ListBlockType,
): { element: Element; consumed: number } | null {
  const openResult = parseListBlockOpen(ctx, startPos);
  if (!openResult || openResult.listType !== listType) {
    return null;
  }

  let pos = openResult.pos;
  let consumed = openResult.consumed;

  const items: ListItem[] = [];
  let foundListClose = false;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") break;

    if (isListClose(ctx, pos, listType)) {
      foundListClose = true;
      const closeConsumed = consumeCloseTag(ctx, pos);
      consumed += closeConsumed;
      break;
    }

    if (token.type === "WHITESPACE" || token.type === "NEWLINE") {
      pos++;
      consumed++;
      continue;
    }

    const nestedListOpen = isNestedListOpen(ctx, pos);
    if (nestedListOpen) {
      const nestedResult = parseListBlock(ctx, pos, nestedListOpen.type);
      if (nestedResult && nestedResult.element.element === "list") {
        items.push({
          "item-type": "sub-list",
          element: "list",
          data: nestedResult.element.data,
        });
        consumed += nestedResult.consumed;
        pos += nestedResult.consumed;
        continue;
      }
    }

    const liResult = parseLiItem(ctx, pos, listType, parseListBlock);
    if (liResult) {
      items.push(liResult.item);
      consumed += liResult.consumed;
      pos += liResult.consumed;
      continue;
    }

    const bareResult = parseBareListContent(ctx, pos, listType);
    if (bareResult.item) {
      items.push(bareResult.item);
    }
    consumed += bareResult.consumed;
    pos += bareResult.consumed;
  }

  if (!foundListClose) {
    ctx.diagnostics.push({
      severity: "warning",
      code: "unclosed-block",
      message: `Missing closing tag [[/${listType}]] for [[${listType}]]`,
      position: ctx.tokens[startPos]?.position ?? {
        start: { line: 0, column: 0, offset: 0 },
        end: { line: 0, column: 0, offset: 0 },
      },
    });
  }

  const listData: ListData = {
    type: listType === "ol" ? "numbered" : "bullet",
    attributes: openResult.attrs,
    items,
  };

  return {
    element: {
      element: "list",
      data: listData,
    },
    consumed,
  };
}
