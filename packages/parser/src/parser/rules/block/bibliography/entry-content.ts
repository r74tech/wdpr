import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseInlineUntil } from "../../inline/utils";
import { parseBlockName } from "../utils";

export interface BibliographyContentResult {
  content: Element[];
  consumed: number;
}

export function parseBibliographyContent(
  ctx: ParseContext,
  startPos: number,
): BibliographyContentResult {
  const content: Element[] = [];
  let pos = startPos;
  let consumed = 0;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    if (token.type === "BLOCK_END_OPEN") {
      const closeNameResult = parseBlockName(ctx, pos + 1);
      if (closeNameResult?.name === "bibliography") {
        break;
      }
    }

    if (token.type === "NEWLINE") {
      const nextToken = ctx.tokens[pos + 1];
      if (nextToken?.type === "COLON" && nextToken.lineStart) {
        pos++;
        consumed++;
        break;
      }
      if (nextToken?.type === "BLOCK_END_OPEN") {
        pos++;
        consumed++;
        break;
      }
      if (nextToken?.type === "NEWLINE" || !nextToken || nextToken.type === "EOF") {
        pos++;
        consumed++;
        break;
      }
      content.push({ element: "line-break" });
      pos++;
      consumed++;
      continue;
    }

    const inlineCtx: ParseContext = { ...ctx, pos };
    const result = parseInlineUntil(inlineCtx, "NEWLINE");
    if (result.elements.length > 0) {
      for (const element of result.elements) content.push(element);
      pos += result.consumed;
      consumed += result.consumed;
    } else {
      pos++;
      consumed++;
    }
  }

  return { content, consumed };
}
