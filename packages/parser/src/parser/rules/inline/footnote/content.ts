import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseFootnoteChild } from "./child";
import { tryConsumeFootnoteClose } from "./close";
import { consumeFootnoteNewline } from "./newline";

export interface FootnoteContentResult {
  paragraphs: Element[][];
  consumed: number;
  foundClose: boolean;
}

export function parseFootnoteContent(ctx: ParseContext, startPos: number): FootnoteContentResult {
  const paragraphs: Element[][] = [[]];
  let currentParagraph = 0;
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    const closeResult = tryConsumeFootnoteClose(ctx, pos);
    if (closeResult) {
      return {
        paragraphs,
        consumed: consumed + closeResult.consumed,
        foundClose: true,
      };
    }

    if (token.type === "NEWLINE") {
      const newlineResult = consumeFootnoteNewline(ctx, pos);
      pos += newlineResult.consumed;
      consumed += newlineResult.consumed;
      if (newlineResult.paragraphBreak) {
        currentParagraph++;
        paragraphs[currentParagraph] = [];
      } else {
        paragraphs[currentParagraph]!.push({ element: "line-break" });
      }
      continue;
    }

    const child = parseFootnoteChild(ctx, pos);
    paragraphs[currentParagraph]!.push(...child.elements);
    pos += child.consumed;
    consumed += child.consumed;
  }

  return { paragraphs, consumed, foundClose: false };
}
