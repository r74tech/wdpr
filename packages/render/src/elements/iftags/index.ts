/**
 *
 * Renderer for `[[iftags]]...[[/iftags]]` conditional blocks.
 *
 * @module
 */

import type { IfTagsData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderElements } from "../../render";
import { evaluateIfTagsCondition } from "./condition";
import { withIfTagsStyleSlot } from "./style-slot";

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

  if (!evaluateIfTagsCondition(data.condition, pageTags)) {
    return;
  }

  const prev = ctx.renderInlineStyles;
  ctx.renderInlineStyles = true;

  withIfTagsStyleSlot(ctx, data, () => {
    renderElements(ctx, data.elements);
  });

  ctx.renderInlineStyles = prev;
}
