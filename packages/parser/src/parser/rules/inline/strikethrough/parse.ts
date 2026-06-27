import type { Element } from "@wdprlib/ast";
import type { ParseContext, RuleResult } from "../../types";
import { createInlineContainer } from "../formatting/container";
import { parseInlineUntil } from "../utils";

export function parseStrikethroughContent(ctx: ParseContext): RuleResult<Element> {
  const result = parseInlineUntil({ ...ctx, pos: ctx.pos + 1 }, "STRIKE_MARKER");

  return {
    success: true,
    elements: [createInlineContainer("strikethrough", result.elements)],
    consumed: 1 + result.consumed + 1,
  };
}
