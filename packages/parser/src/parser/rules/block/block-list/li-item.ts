import type { ListItem } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseAttributes } from "../utils";
import { collectPostLiTrailingContent } from "./item-content";
import { collectLiItemContent, type NestedListParser } from "./li-content";
import {
  consumeCloseTag,
  isLiClose,
  isLiOpen,
  type ListBlockType,
} from "./tags";

/**
 * Parses a single `[[li]]...[[/li]]` list item, including its attributes
 * and body content.
 */
export function parseLiItem(
  ctx: ParseContext,
  startPos: number,
  listType: ListBlockType,
  parseNestedList: NestedListParser,
): { item: ListItem; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  const liOpen = isLiOpen(ctx, pos);
  if (!liOpen) return null;

  pos += liOpen.consumed;
  consumed += liOpen.consumed;

  const attrResult = parseAttributes(ctx, pos);
  pos += attrResult.consumed;
  consumed += attrResult.consumed;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }
  pos++;
  consumed++;

  if (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  const contentResult = collectLiItemContent(ctx, pos, listType, parseNestedList);
  const contentElements = contentResult.elements;
  consumed += contentResult.consumed;
  pos += contentResult.consumed;

  if (!isLiClose(ctx, pos)) {
    ctx.diagnostics.push({
      severity: "warning",
      code: "unclosed-block",
      message: "Missing closing tag [[/li]] for [[li]]",
      position: ctx.tokens[startPos]?.position ?? {
        start: { line: 0, column: 0, offset: 0 },
        end: { line: 0, column: 0, offset: 0 },
      },
    });
  }

  if (isLiClose(ctx, pos)) {
    const closeConsumed = consumeCloseTag(ctx, pos);
    consumed += closeConsumed;
    pos += closeConsumed;

    const trailingResult = collectPostLiTrailingContent(ctx, pos, listType);
    contentElements.push(...trailingResult.elements);
    consumed += trailingResult.consumed;
  }

  return {
    item: {
      "item-type": "elements",
      attributes: attrResult.attrs,
      elements: contentElements,
    },
    consumed,
  };
}
