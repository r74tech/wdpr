import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { isLiClose } from "./tags";

export interface OrphanLiContentResult {
  elements: Element[];
  consumed: number;
  foundClose: boolean;
}

export function collectOrphanLiContent(
  ctx: ParseContext,
  startPos: number,
): OrphanLiContentResult {
  const elements: Element[] = [
    { element: "text", data: "[[" },
    { element: "text", data: "li" },
    { element: "text", data: "]]" },
  ];
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    const liClose = isLiClose(ctx, pos);
    if (liClose) {
      elements.push({ element: "text", data: "[[/" });
      elements.push({ element: "text", data: "li" });
      elements.push({ element: "text", data: "]]" });
      pos += liClose.consumed;
      consumed += liClose.consumed;

      if (ctx.tokens[pos]?.type === "NEWLINE") {
        consumed++;
      }

      return { elements, consumed, foundClose: true };
    }

    if (token.type === "NEWLINE") {
      elements.push({ element: "line-break" });
      pos++;
      consumed++;
      continue;
    }

    if (token.type === "WHITESPACE" && token.lineStart) {
      pos++;
      consumed++;
      continue;
    }

    elements.push({ element: "text", data: token.value });
    pos++;
    consumed++;
  }

  return { elements, consumed, foundClose: false };
}
