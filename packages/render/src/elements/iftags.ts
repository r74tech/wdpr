/**
 *
 * Renderer for `[[iftags]]...[[/iftags]]` conditional blocks.
 *
 * Wikidot's `iftags` construct conditionally renders content based on
 * whether the current page's tags match a condition string. The condition
 * supports three kinds of tag tokens:
 *
 * - `+tag` -- required: the tag must be present
 * - `-tag` -- excluded: the tag must NOT be present
 * - `tag` (no prefix) -- optional group: at least one unprefixed tag must be present
 *
 * All three categories must independently be satisfied for the condition
 * to evaluate to true.
 *
 * @module
 */

import type { IfTagsData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { renderElements } from "../render";

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

/**
 * Render an `[[iftags]]` block.
 *
 * Evaluates the condition against the page's tags (from `ctx.page.tags`).
 * If no page tags are available, an empty array is used (all conditions
 * requiring present tags will fail).
 *
 * @param ctx - The current render context.
 * @param data - IfTags data with condition string and child elements.
 */
export function renderIfTags(ctx: RenderContext, data: IfTagsData): void {
  const pageTags = ctx.page?.tags ?? [];

  if (evaluateIfTagsCondition(data.condition, pageTags)) {
    const prev = ctx.renderInlineStyles;
    ctx.renderInlineStyles = true;

    // If a style slot was assigned during resolve, collect styles into
    // it so they appear at the correct source-order position in the
    // final output. Otherwise fall back to inline rendering.
    const slotId = (data as IfTagsData & { _styleSlot?: number })._styleSlot;
    if (slotId !== undefined) {
      ctx.enterStyleSlot(slotId);
    }

    renderElements(ctx, data.elements);

    if (slotId !== undefined) {
      ctx.exitStyleSlot();
    }
    ctx.renderInlineStyles = prev;
  }
}
