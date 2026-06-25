import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseAnchorChild } from "./child";
import { tryConsumeAnchorClose } from "./close";
import { consumeAnchorNewline } from "./newline";
import { trimParagraphStripLineBreaks } from "./paragraph-strip";

export interface AnchorContentResult {
  children: Element[];
  consumed: number;
  foundClose: boolean;
}

export function parseAnchorContent(
  ctx: ParseContext,
  startPos: number,
  paragraphStrip: boolean,
): AnchorContentResult {
  const children: Element[] = [];
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    const closeResult = tryConsumeAnchorClose(ctx, pos, paragraphStrip);
    if (closeResult !== null) {
      trimParagraphStripLineBreaks(children, paragraphStrip);
      return {
        children,
        consumed: consumed + closeResult.consumed,
        foundClose: true,
      };
    }

    if (token.type === "NEWLINE") {
      const newline = consumeAnchorNewline(ctx, pos, paragraphStrip, children);
      pos += newline.consumed;
      consumed += newline.consumed;
      continue;
    }

    if (token.type === "WHITESPACE" && token.lineStart) {
      pos++;
      consumed++;
      continue;
    }

    const child = parseAnchorChild(ctx, pos);
    children.push(...child.elements);
    pos += child.consumed;
    consumed += child.consumed;
  }

  return { children, consumed, foundClose: false };
}
