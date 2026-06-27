import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBlocksUntil } from "../utils";
import { isDivClose } from "./close";
import { countDivCloses } from "./nesting";
import { unwrapEdgeParagraphs } from "./paragraph-strip";

export interface DivBodyResult {
  elements: Element[];
  consumed: number;
}

export function parseDivBody(
  ctx: ParseContext,
  startPos: number,
  paragraphStrip: boolean,
): DivBodyResult {
  const bodyBudget = resolveDivBodyBudget(ctx, startPos);
  const bodyCtx: ParseContext = {
    ...ctx,
    pos: startPos,
    scope: { ...ctx.scope, divClosesBudget: bodyBudget },
  };

  const bodyResult = parseBlocksUntil(bodyCtx, isDivClose);
  const elements = paragraphStrip ? unwrapEdgeParagraphs(bodyResult.elements) : bodyResult.elements;

  return {
    elements,
    consumed: bodyResult.consumed,
  };
}

function resolveDivBodyBudget(ctx: ParseContext, startPos: number): number {
  if (ctx.scope.divClosesBudget !== undefined) {
    return ctx.scope.divClosesBudget - 1;
  }

  const closesInScope = countDivCloses(ctx, startPos);
  return closesInScope > 0 ? closesInScope - 1 : 0;
}
