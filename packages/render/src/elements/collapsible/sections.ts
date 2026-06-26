import type { CollapsibleData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderElements } from "../../render";
import type { CollapsibleLabels } from "./labels";
import { renderCollapsibleLink, renderHideLink } from "./link";

export function renderFoldedSection(
  ctx: RenderContext,
  startOpen: boolean,
  labels: CollapsibleLabels,
): void {
  const foldedStyle = startOpen ? ` style="display:none"` : "";
  ctx.push(`<div class="collapsible-block-folded"${foldedStyle}>`);
  renderCollapsibleLink(ctx, labels.show);
  ctx.push("</div>");
}

export function renderUnfoldedSection(
  ctx: RenderContext,
  data: CollapsibleData,
  labels: CollapsibleLabels,
): void {
  const unfoldedStyle = data["start-open"] ? "" : ` style="display:none"`;
  ctx.push(`<div class="collapsible-block-unfolded"${unfoldedStyle}>`);

  if (data["show-top"] || (!data["show-top"] && !data["show-bottom"])) {
    renderHideLink(ctx, labels.hide);
  }

  ctx.push(`<div class="collapsible-block-content">`);
  renderElements(ctx, data.elements);
  ctx.push("</div>");

  if (data["show-bottom"]) {
    renderHideLink(ctx, labels.hide);
  }

  ctx.push("</div>");
}
