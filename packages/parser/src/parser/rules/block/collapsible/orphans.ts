import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { isCollapsibleClose } from "./tags";

export function consumeOrphanedCollapsibleCloses(
  ctx: ParseContext,
  startPos: number,
): { elements: Element[]; consumed: number } {
  const elements: Element[] = [];
  let pos = startPos;
  let consumed = 0;

  while (isCollapsibleClose(ctx, pos)) {
    elements.push({ element: "line-break" });

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "NEWLINE" || token.type === "EOF") break;
      elements.push({ element: "text", data: token.value });
      consumed++;
      pos++;
    }

    if (ctx.tokens[pos]?.type === "NEWLINE") {
      consumed++;
      pos++;
    }
  }

  return { elements, consumed };
}
