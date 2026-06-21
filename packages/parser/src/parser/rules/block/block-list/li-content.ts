import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import {
  parseListItemBlockContent,
  parseListItemInlineContent,
} from "./item-content";
import {
  isLiClose,
  isListClose,
  isNestedListOpen,
  type ListBlockType,
} from "./tags";

export type NestedListParser = (
  ctx: ParseContext,
  startPos: number,
  listType: ListBlockType,
) => { element: Element; consumed: number } | null;

export interface LiContentResult {
  elements: Element[];
  consumed: number;
}

export function collectLiItemContent(
  ctx: ParseContext,
  startPos: number,
  listType: ListBlockType,
  parseNestedList: NestedListParser,
): LiContentResult {
  const elements: Element[] = [];
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") break;
    if (isLiClose(ctx, pos) || isListClose(ctx, pos, listType)) break;

    const nestedListOpen = isNestedListOpen(ctx, pos);
    if (nestedListOpen) {
      const nestedResult = parseNestedList(ctx, pos, nestedListOpen.type);
      if (nestedResult) {
        elements.push(nestedResult.element);
        elements.push({ element: "line-break" });
        consumed += nestedResult.consumed;
        pos += nestedResult.consumed;
        continue;
      }
    }

    if (token.type === "WHITESPACE" && token.lineStart) {
      pos++;
      consumed++;
      continue;
    }

    if (token.type === "NEWLINE") {
      const newlineResult = consumeLiItemNewlines(ctx, pos, elements.length > 0);
      if (newlineResult.addLineBreak) {
        elements.push({ element: "line-break" });
      }
      pos += newlineResult.consumed;
      consumed += newlineResult.consumed;
      continue;
    }

    const blockResult = parseListItemBlockContent(ctx, pos, token);
    if (blockResult.matched) {
      elements.push(...blockResult.elements);
      consumed += blockResult.consumed;
      pos += blockResult.consumed;
      continue;
    }

    const inlineResult = parseListItemInlineContent(ctx, pos, token.type);
    if (inlineResult.matched) {
      elements.push(...inlineResult.elements);
      consumed += inlineResult.consumed;
      pos += inlineResult.consumed;
      continue;
    }

    elements.push({ element: "text", data: token.value });
    consumed++;
    pos++;
  }

  return { elements, consumed };
}

function consumeLiItemNewlines(
  ctx: ParseContext,
  startPos: number,
  hasContent: boolean,
): { consumed: number; addLineBreak: boolean } {
  let pos = startPos + 1;
  let consumed = 1;
  let consecutiveNewlines = 1;

  while (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
    consecutiveNewlines++;
  }
  while (ctx.tokens[pos]?.type === "WHITESPACE" && ctx.tokens[pos]?.lineStart) {
    pos++;
    consumed++;
  }

  return {
    consumed,
    addLineBreak: consecutiveNewlines === 1 && hasContent,
  };
}
