import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { isNonBoundaryBlockToken } from "./non-boundary";

export interface InlineNewlineResult {
  consumed: number;
  addLineBreak: boolean;
}

export function consumeInlineContentNewlines(
  ctx: ParseContext,
  startPos: number,
): InlineNewlineResult {
  let pos = startPos + 1;
  let consumed = 1;

  while (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  const nextToken = ctx.tokens[pos];
  if (!nextToken || nextToken.type === "EOF") {
    return { consumed, addLineBreak: false };
  }

  if (nextToken.type === "BLOCK_OPEN" || nextToken.type === "BLOCK_END_OPEN") {
    const peekCtx: ParseContext = { ...ctx, pos };
    if (!isNonBoundaryBlockToken(peekCtx, pos)) {
      return { consumed, addLineBreak: false };
    }
  }

  return { consumed, addLineBreak: true };
}

export function removeTrailingLineBreaks(elements: Element[]): void {
  while (elements.length > 0 && elements[elements.length - 1]?.element === "line-break") {
    elements.pop();
  }
}
