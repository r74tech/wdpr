/**
 *
 * Parsing and evaluation of `[[iftags]]` condition strings.
 *
 * The condition string uses a simple syntax where each whitespace-separated
 * token is a tag name with an optional prefix:
 * - `+tag` - Tag must be present (AND condition)
 * - `-tag` - Tag must be absent (NOT condition)
 * - `tag` - At least one bare tag must be present (OR condition)
 *
 * All three categories must independently be satisfied:
 * required (AND) + forbidden (AND) + optional (OR).
 *
 * @module
 */

import type { TagCondition } from "./types";

/**
 * Parse iftags condition string into structured format
 *
 * @param condition - Raw condition string like "+fruit -admin component"
 * @returns Parsed condition with required, forbidden, and optional tags
 */
export function parseTagCondition(condition: string): TagCondition {
  const required: string[] = [];
  const forbidden: string[] = [];
  const optional: string[] = [];
  let hasEmptyRequired = false;
  let hasEmptyForbidden = false;

  const parts = condition.trim().split(/\s+/);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith("+")) {
      const tag = part.slice(1);
      if (tag) required.push(tag);
      else hasEmptyRequired = true;
    } else if (part.startsWith("-")) {
      const tag = part.slice(1);
      if (tag) forbidden.push(tag);
      else hasEmptyForbidden = true;
    } else {
      optional.push(part);
    }
  }

  return { required, forbidden, optional, hasEmptyRequired, hasEmptyForbidden };
}

/**
 * Evaluate if a tag condition matches the given tags
 *
 * @param condition - Parsed tag condition
 * @param pageTags - Actual tags on the page
 * @returns true if condition is satisfied
 */
export function evaluateTagCondition(condition: TagCondition, pageTags: string[]): boolean {
  const noNamedTokens =
    condition.required.length === 0 &&
    condition.forbidden.length === 0 &&
    condition.optional.length === 0;

  // No tokens at all = supercommentout (`[[iftags]]`) → never match.
  if (noNamedTokens && !condition.hasEmptyRequired && !condition.hasEmptyForbidden) {
    return false;
  }

  // A bare `+` (with or without other tokens) means "require an unnamed
  // tag", which can never be satisfied — the whole condition is Hide.
  if (condition.hasEmptyRequired) {
    return false;
  }

  // `[[iftags - ]]` — bare `-` token alone means "forbid nothing", which
  // is trivially true, so this is Show Always. When combined with other
  // tokens the bare `-` adds no constraint, so we fall through to the
  // standard evaluation below.
  if (condition.hasEmptyForbidden && noNamedTokens) {
    return true;
  }

  const tagSet = new Set(pageTags);

  // All required tags must be present
  for (const tag of condition.required) {
    if (!tagSet.has(tag)) {
      return false;
    }
  }

  // All forbidden tags must be absent
  for (const tag of condition.forbidden) {
    if (tagSet.has(tag)) {
      return false;
    }
  }

  // At least one optional tag must be present (if any specified)
  if (condition.optional.length > 0) {
    if (!condition.optional.some((tag) => tagSet.has(tag))) {
      return false;
    }
  }

  return true;
}
