import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseInlineUntil } from "../utils";

export interface UnderlineChildResult {
  elements: Element[];
  consumed: number;
}

export function parseUnderlineChild(ctx: ParseContext, pos: number): UnderlineChildResult {
  const token = ctx.tokens[pos];
  if (!token) {
    return { elements: [], consumed: 0 };
  }

  if (token.type === "NEWLINE") {
    return { elements: [{ element: "line-break" }], consumed: 1 };
  }

  const result = parseInlineUntil({ ...ctx, pos }, "UNDERLINE_MARKER");
  if (result.elements.length > 0) {
    return { elements: result.elements, consumed: result.consumed };
  }

  return { elements: [{ element: "text", data: token.value }], consumed: 1 };
}
