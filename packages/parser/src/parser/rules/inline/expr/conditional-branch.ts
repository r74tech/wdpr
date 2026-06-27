import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseInlineBranch } from "./branch";
import { skipWhitespace } from "./syntax";

export interface ConditionalBranchResult {
  elements: Element[];
  consumed: number;
  nextPos: number;
  endedWithPipe: boolean;
}

export function parseConditionalBranch(
  ctx: ParseContext,
  startPos: number,
): ConditionalBranchResult {
  const branchStart = skipWhitespace(ctx, startPos);
  const leadingWhitespaceConsumed = branchStart - startPos;
  const branchResult = parseInlineBranch(ctx, branchStart);

  return {
    elements: branchResult.elements,
    consumed: leadingWhitespaceConsumed + branchResult.consumed,
    nextPos: branchStart + branchResult.consumed,
    endedWithPipe: branchResult.endedWithPipe,
  };
}
