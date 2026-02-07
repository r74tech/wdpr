/**
 * @module elements/collapsible
 *
 * Renderer for `[[collapsible]]...[[/collapsible]]` blocks.
 *
 * Wikidot's collapsible markup produces a two-state widget: a "folded"
 * state showing a "show" link and an "unfolded" state showing the
 * content plus a "hide" link. Toggle behavior is handled at runtime
 * by the `collapsible` runtime module.
 *
 * This renderer outputs the full DOM structure for both states, with
 * visibility controlled via inline `display` styles based on the
 * `start-open` flag. The "hide" link can appear at the top, bottom,
 * or both positions.
 */

import type { CollapsibleData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";
import { renderElements } from "../render";

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
  const showTop = data["show-top"];
  const showBottom = data["show-bottom"];

  // Determine show/hide link text with &nbsp; encoding
  // When custom text is provided, use it as-is (it already contains the prefix like "+ Show")
  // When not provided, use default prefix + text
  const showLabel = data["show-text"]
    ? formatLabelText(data["show-text"])
    : formatCollapsibleText("+", "show block");
  const hideLabel = data["hide-text"]
    ? formatLabelText(data["hide-text"])
    : formatCollapsibleText("\u2013", "hide block");

  ctx.push(`<div class="collapsible-block">`);

  // Folded state
  const foldedStyle = startOpen ? ` style="display:none"` : "";
  ctx.push(`<div class="collapsible-block-folded"${foldedStyle}>`);
  ctx.push(`<a class="collapsible-block-link" href="javascript:;">${showLabel}</a>`);
  ctx.push("</div>");

  // Unfolded state
  const unfoldedStyle = startOpen ? "" : ` style="display:none"`;
  ctx.push(`<div class="collapsible-block-unfolded"${unfoldedStyle}>`);

  // Hide link at top (default position)
  if (showTop || (!showTop && !showBottom)) {
    ctx.push(`<div class="collapsible-block-unfolded-link">`);
    ctx.push(`<a class="collapsible-block-link" href="javascript:;">${hideLabel}</a>`);
    ctx.push("</div>");
  }

  // Content
  ctx.push(`<div class="collapsible-block-content">`);
  renderElements(ctx, data.elements);
  ctx.push("</div>");

  // Hide link at bottom
  if (showBottom) {
    ctx.push(`<div class="collapsible-block-unfolded-link">`);
    ctx.push(`<a class="collapsible-block-link" href="javascript:;">${hideLabel}</a>`);
    ctx.push("</div>");
  }

  ctx.push("</div>"); // close unfolded
  ctx.push("</div>"); // close collapsible-block
}

/**
 * Format a default collapsible link label by prepending a prefix symbol
 * (e.g. "+" or en-dash) with `&nbsp;` encoding for spaces.
 *
 * @param prefix - Symbol character prepended before the label text.
 * @param text - Default label text (e.g. "show block").
 * @returns HTML-safe label string with non-breaking spaces.
 */
function formatCollapsibleText(prefix: string, text: string): string {
  const encoded = escapeHtml(text).replace(/ /g, "&nbsp;");
  return `${prefix}&nbsp;${encoded}`;
}

/**
 * Format a custom collapsible link label by escaping HTML and
 * replacing spaces with `&nbsp;` (matching Wikidot behavior).
 *
 * @param text - Custom label text provided by the user.
 * @returns HTML-safe label string with non-breaking spaces.
 */
function formatLabelText(text: string): string {
  return escapeHtml(text).replace(/ /g, "&nbsp;");
}
