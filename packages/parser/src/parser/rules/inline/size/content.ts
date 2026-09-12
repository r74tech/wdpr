import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBlockName } from "../../common";
import { parseInlineUntil } from "../utils";

export interface SizeContentResult {
  children: Element[];
  consumed: number;
  foundClose: boolean;
}

export function parseSizeContent(ctx: ParseContext, startPos: number): SizeContentResult {
  const children: Element[] = [];
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
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

    const inlineCtx: ParseContext = { ...ctx, pos };
    const inlineResult = parseInlineUntil(inlineCtx, "BLOCK_END_OPEN");
    if (inlineResult.elements.length > 0) {
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
