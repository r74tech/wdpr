import type { RenderContext } from "../../context";
import { escapeHtml } from "../../escape";
import { renderTocEntries } from "./entries";

export function renderTocBody(ctx: RenderContext, title?: string): void {
  ctx.push(
    `<div id="toc-action-bar"><a href="javascript:;">${escapeHtml(ctx.messages.text({ id: "toc.fold", defaultMessage: "Fold" }))}</a><a style="display: none" href="javascript:;">${escapeHtml(ctx.messages.text({ id: "toc.unfold", defaultMessage: "Unfold" }))}</a></div>`,
  );
  ctx.push(
    `<div class="title">${escapeHtml(title ?? ctx.messages.text({ id: "toc.title", defaultMessage: "Table of Contents" }))}</div>`,
  );
  ctx.push(`<div id="toc-list">`);
  renderTocEntries(ctx, ctx.tocElements);
  ctx.push("</div>");
}
