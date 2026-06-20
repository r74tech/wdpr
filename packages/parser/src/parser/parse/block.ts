import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../rules";
import { getCandidateBlockRules } from "../rules/block/utils";

export function parseNextBlock(
  ctx: ParseContext,
  skipWhitespace: () => void,
  isAtEnd: () => boolean,
): Element[] {
  skipWhitespace();

  if (isAtEnd()) {
    return [];
  }

  const token = ctx.tokens[ctx.pos];
  if (!token) {
    return [];
  }

  if (token.type === "NEWLINE") {
    ctx.pos++;
    return [];
  }

  for (const rule of getCandidateBlockRules(ctx.blockRules, token)) {
    const result = rule.parse(ctx);
    if (result.success) {
      ctx.pos += result.consumed;
      return result.elements;
    }
  }

  const result = ctx.blockFallbackRule.parse(ctx);
  if (result.success && result.elements.length > 0) {
    ctx.pos += result.consumed;
    return result.elements;
  }

  ctx.pos++;
  return [];
}
