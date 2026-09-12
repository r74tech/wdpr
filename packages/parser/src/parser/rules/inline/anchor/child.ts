import type { Token } from "../../../../lexer";
import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { inlineRules } from "../index";
import { getCandidateInlineRules } from "../utils";

export interface AnchorChildResult {
  elements: Element[];
  consumed: number;
  stripLeadingLineBreak?: Token;
}

export function parseAnchorChild(ctx: ParseContext, pos: number): AnchorChildResult {
  const token = ctx.tokens[pos];
  if (!token) {
    return { elements: [], consumed: 0 };
  }

  const inlineCtx: ParseContext = {
    ...ctx,
    pos,
    scope: { ...ctx.scope, suppressEmailLinks: true },
  };
  for (const rule of getCandidateInlineRules(inlineRules, token.type)) {
    const result = rule.parse(inlineCtx);
    if (result.success) {
      return result;
    }
  }

  return { elements: [{ element: "text", data: token.value }], consumed: 1 };
}
