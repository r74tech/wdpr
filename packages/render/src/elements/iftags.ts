import type { IfTagsData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { renderElements } from "../render";

/**
 * Evaluate iftags condition against page tags
 * Condition format: "+tag1 -tag2 tag3" where:
 * - +tag: tag must be present (required)
 * - -tag: tag must NOT be present (excluded)
 * - tag (no prefix): at least one such tag must be present (optional group)
 */
function evaluateIfTagsCondition(condition: string, pageTags: string[]): boolean {
  const pageTagSet = new Set(pageTags.map((t) => t.toLowerCase()));
  const tokens = condition.split(/\s+/).filter(Boolean);

  // Empty condition = never show
  if (tokens.length === 0) {
    return false;
  }

  const required: string[] = [];
  const excluded: string[] = [];
  const optional: string[] = [];

  for (const token of tokens) {
    if (token.startsWith("+")) {
      required.push(token.slice(1).toLowerCase());
    } else if (token.startsWith("-")) {
      excluded.push(token.slice(1).toLowerCase());
    } else {
      optional.push(token.toLowerCase());
    }
  }

  // All required tags must be present
  for (const tag of required) {
    if (!pageTagSet.has(tag)) return false;
  }

  // All excluded tags must NOT be present
  for (const tag of excluded) {
    if (pageTagSet.has(tag)) return false;
  }

  // If there are optional tags, at least one must be present
  if (optional.length > 0) {
    const hasAnyOptional = optional.some((tag) => pageTagSet.has(tag));
    if (!hasAnyOptional) return false;
  }

  return true;
}

/** Render if-tags - renders the elements only if condition matches page tags */
export function renderIfTags(ctx: RenderContext, data: IfTagsData): void {
  const pageTags = ctx.page?.tags ?? [];

  if (evaluateIfTagsCondition(data.condition, pageTags)) {
    renderElements(ctx, data.elements);
  }
}
