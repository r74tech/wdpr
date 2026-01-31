import type { CollapsibleData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";
import { renderElements } from "../render";

/** Render a collapsible block (Wikidot-compatible structure) */
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

function formatCollapsibleText(prefix: string, text: string): string {
  const encoded = escapeHtml(text).replace(/ /g, "&nbsp;");
  return `${prefix}&nbsp;${encoded}`;
}

function formatLabelText(text: string): string {
  return escapeHtml(text).replace(/ /g, "&nbsp;");
}
