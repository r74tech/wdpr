import type { ParseContext } from "../../types";
import { isParagraphBreakingBlockStart } from "./block-start-predicates";

export interface ParagraphNewlineBoundary {
  shouldBreak: boolean;
  consumed: number;
  preservePrecedingLineBreak: boolean;
}

export function getParagraphNewlineBoundary(
  ctx: ParseContext,
  newlinePos: number,
  hasContent: boolean,
): ParagraphNewlineBoundary {
  const lookAhead = skipWhitespaceAfterNewline(ctx, newlinePos);
  const nextMeaningfulToken = ctx.tokens[newlinePos + lookAhead];
  const nextPos = newlinePos + lookAhead;
  const isBlockStart = isParagraphBreakingBlockStart(ctx, newlinePos, lookAhead);

  if (
    nextMeaningfulToken &&
    nextMeaningfulToken.type !== "NEWLINE" &&
    nextMeaningfulToken.type !== "EOF" &&
    !isBlockStart
  ) {
    return { shouldBreak: false, consumed: 0, preservePrecedingLineBreak: false };
  }

  return {
    shouldBreak: true,
    consumed: nextMeaningfulToken?.type === "NEWLINE" ? 2 : 1,
    preservePrecedingLineBreak:
      hasContent &&
      isBlockStart &&
      ctx.blockRules.some(
        (rule) => rule.preservesPrecedingLineBreak && rule.isStartPattern?.(ctx, nextPos),
      ),
  };
}

function skipWhitespaceAfterNewline(ctx: ParseContext, newlinePos: number): number {
  let lookAhead = 1;
  while (ctx.tokens[newlinePos + lookAhead]?.type === "WHITESPACE") {
    lookAhead++;
  }
  return lookAhead;
}
