/**
 *
 * Renderer for `[[module Rate]]`.
 *
 * The Rate module displays a page rating widget with upvote, downvote,
 * and cancel buttons. The initial score is rendered as 0; the runtime
 * `rate` module handles click events and updates the display via the
 * `onRate` callback.
 *
 * The widget HTML structure matches Wikidot's original output, using
 * Bootstrap-style `btn btn-default` classes alongside Wikidot-specific
 * class names (`rateup`, `ratedown`, `cancel`, `rate-points`).
 *
 * @module
 */

import type { RenderContext } from "../../context";

/**
 * Render a `[[module Rate]]` page rating widget.
 *
 * Outputs a `<div class="page-rate-widget-box">` containing:
 * - A score display span (`.rate-points > .number`)
 * - An upvote button (`.rateup`)
 * - A downvote button (`.ratedown`) using an en-dash character
 * - A cancel button (`.cancel`)
 *
 * @param ctx - The current render context.
 */
export function renderRate(ctx: RenderContext): void {
  ctx.push(`<div class="page-rate-widget-box">`);
  ctx.push(`<span class="rate-points">rating:&nbsp;<span class="number prw54353">0</span></span>`);
  ctx.push(
    `<span class="rateup btn btn-default"><a title="I like it" href="javascript:;">+</a></span>`,
  );
  // &#8211; is en-dash
  ctx.push(
    `<span class="ratedown btn btn-default"><a title="I don't like it" href="javascript:;">&#8211;</a></span>`,
  );
  ctx.push(
    `<span class="cancel btn btn-default"><a title="Cancel my vote" href="javascript:;">x</a></span>`,
  );
  ctx.push("</div>");
}
