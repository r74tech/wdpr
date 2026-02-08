/**
 *
 * Parsing and evaluation of `[[iftags]]` condition strings.
 *
 * The condition string uses a simple syntax where each whitespace-separated
 * token is a tag name with an optional prefix:
 * - `+tag` - Tag must be present (AND condition)
 * - `-tag` - Tag must be absent (NOT condition)
 * - `tag` - Tag must be present (same as `+tag`)
 *
 * All required tags must be present AND all forbidden tags must be absent
 * for the condition to evaluate to true.
 *
 * @module
 */

import type { TagCondition } from "./types";

/**
 * Parse iftags condition string into structured format
 *
 * @param condition - Raw condition string like "+fruit -admin component"
 * @returns Parsed condition with required and forbidden tags
 */
export function parseTagCondition(condition: string): TagCondition {
  const required: string[] = [];
  const forbidden: string[] = [];

  const parts = condition.trim().split(/\s+/);

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith("+")) {
      const tag = part.slice(1);
      if (tag) required.push(tag);
    } else if (part.startsWith("-")) {
      const tag = part.slice(1);
      if (tag) forbidden.push(tag);
    } else {
      // No prefix means required
      required.push(part);
    }
  }

  return { required, forbidden };
}

/**
 * Evaluate if a tag condition matches the given tags
 *
 * @param condition - Parsed tag condition
 * @param pageTags - Actual tags on the page
 * @returns true if condition is satisfied
 */
export function evaluateTagCondition(condition: TagCondition, pageTags: string[]): boolean {
  // Empty condition = never match (supercommentout)
  if (condition.required.length === 0 && condition.forbidden.length === 0) {
    return false;
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

  return true;
}
