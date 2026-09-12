import { createAutomaticLineBreak } from "../../inline/parsing/automatic-line-break";
import type { ParseContext } from "../../types";
import type { CellContentAccumulator } from "./cell-content/segments";

export interface CellNewlineResult {
  consumed: number;
}

export function consumeCellContentNewline(
  ctx: ParseContext,
  startPos: number,
  content: CellContentAccumulator,
): CellNewlineResult {
  let pos = startPos + 1;
  let consumed = 1;

  if (ctx.tokens[pos]?.type === "NEWLINE") {
    while (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    content.addParagraphBreak();

    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    return { consumed };
  }

  const nextToken = ctx.tokens[pos];
  if (!nextToken || nextToken.type === "BLOCK_END_OPEN" || nextToken.type === "EOF") {
    return { consumed };
  }

  if (nextToken.type === "BLOCK_OPEN") {
    content.closeInlineSegmentBeforeBlock();
    return { consumed };
  }

  if (!content.isEmpty()) {
    content.addInline(createAutomaticLineBreak(ctx.tokens[startPos]!));
  }

  return { consumed };
}
