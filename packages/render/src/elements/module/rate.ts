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
import { getRateWidgetParts } from "./rate-markup";

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
  for (const part of getRateWidgetParts()) {
    ctx.push(part);
  }
}
