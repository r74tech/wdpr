/**
 *
 * Renderer for `[[collapsible]]...[[/collapsible]]` blocks.
 *
 * @module
 */

import type { CollapsibleData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { getCollapsibleLabels } from "./labels";
import { renderFoldedSection, renderUnfoldedSection } from "./sections";

/**
 * Render a `[[collapsible]]` block with Wikidot-compatible HTML structure.
 *
 * The output contains both folded and unfolded states. Spaces in
 * show/hide labels are encoded as `&nbsp;` to match Wikidot's behavior.
 *
 * @param ctx - The current render context.
 * @param data - Collapsible block data with show/hide text, start-open
 *   flag, and top/bottom link placement options.
 */
export function renderCollapsible(ctx: RenderContext, data: CollapsibleData): void {
  const startOpen = data["start-open"];
  const labels = getCollapsibleLabels(data);

  ctx.push(`<div class="collapsible-block">`);
  renderFoldedSection(ctx, startOpen, labels);
  renderUnfoldedSection(ctx, data, labels);
  ctx.push("</div>");
}
