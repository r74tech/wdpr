import type { RenderContext } from "../../context";
import { escapeAttr, escapeHtml } from "../../escape";

export function getRateWidgetParts(ctx: RenderContext): string[] {
  return [
    `<div class="page-rate-widget-box">`,
    `<span class="rate-points">${escapeHtml(ctx.messages.text("rate.label"))}:&nbsp;<span class="number prw54353">0</span></span>`,
    `<span class="rateup btn btn-default"><a title="${escapeAttr(ctx.messages.text("rate.up"))}" href="javascript:;">+</a></span>`,
    `<span class="ratedown btn btn-default"><a title="${escapeAttr(ctx.messages.text("rate.down"))}" href="javascript:;">&#8211;</a></span>`,
    `<span class="cancel btn btn-default"><a title="${escapeAttr(ctx.messages.text("rate.cancel"))}" href="javascript:;">x</a></span>`,
    "</div>",
  ];
}
