import { hasAnyIfTagsConditionToken, parseIfTagsConditionTokens } from "./tokens";

/**
 * Evaluate an iftags condition string against a list of page tags.
 *
 * The condition is a space-separated list of tokens. All required tags
 * (`+tag`) must be present, all excluded tags (`-tag`) must be absent,
 * and at least one optional tag (bare `tag`) must be present (if any
 * optional tags are specified).
 *
 * An empty condition always evaluates to `false`.
 *
 * @param condition - The condition string (e.g. `"+scp -joke tale"`).
 * @param pageTags - Array of tags currently assigned to the page.
 * @returns `true` if the condition is satisfied.
 */
export function evaluateIfTagsCondition(condition: string, pageTags: string[]): boolean {
  const pageTagSet = new Set(pageTags.map((tag) => tag.toLowerCase()));
  const tokens = parseIfTagsConditionTokens(condition);

  if (!hasAnyIfTagsConditionToken(tokens)) {
    return false;
  }

  return (
    hasRequiredTags(tokens.required, pageTagSet) &&
    hasNoExcludedTags(tokens.excluded, pageTagSet) &&
    hasOptionalTagIfNeeded(tokens.optional, pageTagSet)
  );
}

function hasRequiredTags(required: string[], pageTags: ReadonlySet<string>): boolean {
  return required.every((tag) => pageTags.has(tag));
}

function hasNoExcludedTags(excluded: string[], pageTags: ReadonlySet<string>): boolean {
  return excluded.every((tag) => !pageTags.has(tag));
}

function hasOptionalTagIfNeeded(optional: string[], pageTags: ReadonlySet<string>): boolean {
  return optional.length === 0 || optional.some((tag) => pageTags.has(tag));
}
