import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { getCandidateBlockRules } from "./rule-dispatch";

export interface BlockItemResult {
  elements: Element[];
  consumed: number;
}

export function parseBlockItem(ctx: ParseContext): BlockItemResult {
  const token = ctx.tokens[ctx.pos];
  if (!token) {
    return { elements: [], consumed: 0 };
  }

  for (const rule of getCandidateBlockRules(ctx.blockRules, token)) {
    const result = rule.parse(ctx);
    if (result.success) {
      return { elements: result.elements, consumed: result.consumed };
    }
  }

  const fallback = ctx.blockFallbackRule.parse(ctx);
  if (fallback.success && fallback.elements.length > 0) {
    return { elements: fallback.elements, consumed: fallback.consumed };
  }

  return { elements: [], consumed: 1 };
}
