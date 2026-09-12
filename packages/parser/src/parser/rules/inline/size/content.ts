import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBlockName } from "../../common";
import { parseInlineUntil } from "../utils";
import { protectedInlineRegionEnd } from "../raw/end";
import { parseSizeOpen } from "./open";

export interface SizeContentResult {
  children: Element[];
  consumed: number;
  foundClose: boolean;
}

export function parseSizeContent(ctx: ParseContext, startPos: number): SizeContentResult {
  const children: Element[] = [];
  let pos = startPos;
  let consumed = 0;
  const inlineEnd = findSizeClose(ctx, startPos);

  while (pos < (ctx.scope.inlineEnd ?? ctx.tokens.length)) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    const closeResult = tryConsumeSizeClose(ctx, pos);
    if (closeResult) {
      return {
        children,
        consumed: consumed + closeResult.consumed,
        foundClose: true,
      };
    }

    const inlineCtx: ParseContext = { ...ctx, pos, scope: { ...ctx.scope, inlineEnd } };
    const inlineResult = parseInlineUntil(inlineCtx, "EOF");
    if (inlineResult.consumed > 0) {
      for (const element of inlineResult.elements) children.push(element);
      pos += inlineResult.consumed;
      consumed += inlineResult.consumed;
    } else {
      children.push({ element: "text", data: token.value });
      pos++;
      consumed++;
    }
  }

  return { children, consumed, foundClose: false };
}

function findSizeClose(ctx: ParseContext, startPos: number): number {
  const end = ctx.scope.inlineEnd ?? ctx.tokens.length;
  let depth = 0;
  for (let pos = startPos; pos < end; pos++) {
    const protectedEnd = protectedInlineRegionEnd(ctx.tokens, pos, end);
    if (protectedEnd > pos) {
      pos = protectedEnd - 1;
      continue;
    }
    const open = ctx.tokens[pos]?.type === "BLOCK_OPEN" ? parseSizeOpen({ ...ctx, pos }) : null;
    if (open) {
      depth++;
      pos = open.bodyStart - 1;
      continue;
    }
    const close = tryConsumeSizeClose(ctx, pos);
    if (!close) continue;
    if (depth === 0) return pos;
    depth--;
    pos += close.consumed - 1;
  }
  return end;
}

function tryConsumeSizeClose(ctx: ParseContext, pos: number): { consumed: number } | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") {
    return null;
  }

  const closeNameResult = parseBlockName(ctx, pos + 1);
  if (!closeNameResult || closeNameResult.name !== "size") {
    return null;
  }

  let closePos = pos + 1 + closeNameResult.consumed;
  let consumed = 1 + closeNameResult.consumed;
  if (ctx.tokens[closePos]?.type === "BLOCK_CLOSE") {
    consumed++;
  }

  return { consumed };
}
