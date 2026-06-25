import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseUnderlineChild } from "./child";

export function parseUnderlineContent(
  ctx: ParseContext,
  startPos: number,
): { children: Element[]; consumed: number } {
  const children: Element[] = [];
  let pos = startPos;
  let consumed = 1;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") break;

    if (token.type === "UNDERLINE_MARKER") {
      consumed++;
      break;
    }

    const child = parseUnderlineChild(ctx, pos);
    children.push(...child.elements);
    pos += child.consumed;
    consumed += child.consumed;
  }

  return { children, consumed };
}
