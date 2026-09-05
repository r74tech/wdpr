import type { RenderContext } from "../../context";
import { escapeHtml } from "../../escape";
import { renderTocEntries } from "./entries";

export function renderTocBody(ctx: RenderContext, title = "Table of Contents"): void {
  ctx.push(
    `<div id="toc-action-bar"><a href="javascript:;">Fold</a><a style="display: none" href="javascript:;">Unfold</a></div>`,
  );
  ctx.push(`<div class="title">${escapeHtml(title)}</div>`);
  ctx.push(`<div id="toc-list">`);
  renderTocEntries(ctx, ctx.tocElements);
  ctx.push("</div>");
}
