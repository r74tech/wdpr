import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBlocksUntil } from "../utils";
import { isCollapsibleClose } from "./tags";

const EXCLUDED_BLOCKS = new Set(["collapsible"]);

export function parseCollapsibleBody(
  ctx: ParseContext,
  startPos: number,
  hasNewlineAfterOpen: boolean,
): { elements: Element[]; consumed: number } {
  if (
    !hasNewlineAfterOpen &&
    ctx.tokens[startPos]?.type !== "EOF" &&
    ctx.tokens[startPos]?.type !== "BLOCK_END_OPEN"
  ) {
    return parseInlineCollapsibleBody(ctx, startPos);
  }

  const bodyCtx: ParseContext = { ...ctx, pos: startPos };
  const closeCondition = (checkCtx: ParseContext): boolean => {
    return isCollapsibleClose(checkCtx, checkCtx.pos);
  };
  const bodyResult = parseBlocksUntil(bodyCtx, closeCondition, {
    excludedBlockNames: EXCLUDED_BLOCKS,
  });

  return {
    elements: bodyResult.elements,
    consumed: bodyResult.consumed,
  };
}

function parseInlineCollapsibleBody(
  ctx: ParseContext,
  startPos: number,
): { elements: Element[]; consumed: number } {
  const inlineElements: Element[] = [];
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF" || token.type === "NEWLINE") break;
    if (isCollapsibleClose(ctx, pos)) break;
    inlineElements.push({ element: "text", data: token.value });
    pos++;
    consumed++;
  }

  if (inlineElements.length === 0) {
    return { elements: [], consumed };
  }

  return {
    elements: [
      {
        element: "container",
        data: {
          type: "paragraph",
          attributes: {},
          elements: inlineElements,
        },
      },
    ],
    consumed,
  };
}
