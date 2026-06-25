import type { TokenType } from "../../../../lexer";
import type { InlineRule } from "../../types";

/**
 * Check if an inline rule can be applied.
 */
export function canApplyInlineRule(rule: InlineRule, token: { type: TokenType }): boolean {
  if (rule.startTokens.length === 0) {
    return true;
  }
  return rule.startTokens.includes(token.type);
}

const inlineRuleCandidateCache = new WeakMap<InlineRule[], Map<TokenType, InlineRule[]>>();

export function getCandidateInlineRules(
  inlineRules: InlineRule[],
  tokenType: TokenType,
): InlineRule[] {
  let byType = inlineRuleCandidateCache.get(inlineRules);
  if (!byType) {
    byType = new Map();
    inlineRuleCandidateCache.set(inlineRules, byType);
  }

  const cached = byType.get(tokenType);
  if (cached) {
    return cached;
  }

  const candidates = inlineRules.filter((rule) => canApplyInlineRule(rule, { type: tokenType }));
  byType.set(tokenType, candidates);
  return candidates;
}

