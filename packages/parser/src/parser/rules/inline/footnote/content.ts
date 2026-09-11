import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBlocksUntil } from "../../block/parsing/content";
import { tryConsumeFootnoteClose } from "./close";
import { findFootnoteEnd } from "./boundary";

export interface FootnoteContentResult {
  elements: Element[];
  consumed: number;
  foundClose: boolean;
  leadingParagraphBreak: boolean;
}

export function parseFootnoteContent(ctx: ParseContext, startPos: number): FootnoteContentResult {
  const end = findFootnoteEnd(ctx, startPos);
  let leadingNewlines = 0;
  for (let pos = startPos; pos < end; pos++) {
    const type = ctx.tokens[pos]?.type;
    if (type === "NEWLINE") leadingNewlines++;
    else if (type !== "WHITESPACE") break;
  }

  const bodyCtx: ParseContext = {
    ...ctx,
    tokens: ctx.tokens.slice(startPos, end),
    pos: 0,
    scope: {
      ...ctx.scope,
      inlineEnd: undefined,
      tableFormatting: undefined,
      blockCloseCondition: undefined,
    },
  };
  const result = parseBlocksUntil(bodyCtx, () => false);
  const close = tryConsumeFootnoteClose(ctx, end);
  return {
    elements: result.elements,
    consumed: end - startPos + (close?.consumed ?? 0),
    foundClose: close !== null,
    leadingParagraphBreak: leadingNewlines >= 2,
  };
}
