import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseInlineUntil } from "../utils";

export interface FootnoteChildResult {
  elements: Element[];
  consumed: number;
}

export function parseFootnoteChild(ctx: ParseContext, pos: number): FootnoteChildResult {
  const token = ctx.tokens[pos];
  if (!token) {
    return { elements: [], consumed: 0 };
  }

  const inlineResult = parseInlineUntil({ ...ctx, pos }, "BLOCK_END_OPEN");
  if (inlineResult.elements.length > 0) {
    return { elements: inlineResult.elements, consumed: inlineResult.consumed };
  }

  return { elements: [{ element: "text", data: token.value }], consumed: 1 };
}
