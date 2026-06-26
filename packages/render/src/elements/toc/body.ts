import type { RenderContext } from "../../context";
import { renderTocEntries } from "./entries";

export function renderTocBody(ctx: RenderContext): void {
  ctx.push(
    `<div id="toc-action-bar"><a href="javascript:;">Fold</a><a style="display: none" href="javascript:;">Unfold</a></div>`,
  );
  ctx.push(`<div class="title">Table of Contents</div>`);
  ctx.push(`<div id="toc-list">`);
  renderTocEntries(ctx, ctx.tocElements);
  ctx.push("</div>");
}
