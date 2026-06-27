import type { Token } from "../../../../lexer";
import type { BlockRule } from "../../types";

/**
 * Determines whether a block rule is eligible for the current token.
 *
 * A rule is eligible if:
 * 1. The token is at line start (when `rule.requiresLineStart` is true).
 * 2. The token's type is in the rule's `startTokens` list (or the list
 *    is empty, meaning the rule is a universal fallback).
 *
 * @param rule  - The block rule to check.
 * @param token - The current token.
 * @returns `true` if the rule may be attempted.
 */
export function canApplyBlockRule(rule: BlockRule, token: Token): boolean {
  if (rule.requiresLineStart && !token.lineStart) {
    return false;
  }
  if (rule.startTokens.length === 0) {
    return true; // fallback rule
  }
  return rule.startTokens.includes(token.type);
}

const blockRuleCandidateCache = new WeakMap<BlockRule[], Map<string, BlockRule[]>>();

export function getCandidateBlockRules(blockRules: BlockRule[], token: Token): BlockRule[] {
  let byToken = blockRuleCandidateCache.get(blockRules);
  if (!byToken) {
    byToken = new Map();
    blockRuleCandidateCache.set(blockRules, byToken);
  }

  const key = `${token.type}:${token.lineStart ? "1" : "0"}`;
  const cached = byToken.get(key);
  if (cached) {
    return cached;
  }

  const candidates = blockRules.filter((rule) => canApplyBlockRule(rule, token));
  byToken.set(key, candidates);
  return candidates;
}
