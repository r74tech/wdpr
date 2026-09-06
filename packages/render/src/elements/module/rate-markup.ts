import type { RenderContext } from "../../context";
import { escapeAttr, escapeHtml } from "../../escape";

export function getRateWidgetParts(ctx: RenderContext): string[] {
  return [
    `<div class="page-rate-widget-box">`,
    `<span class="rate-points">${escapeHtml(ctx.messages.text({ id: "rate.label", defaultMessage: "rating" }))}:&nbsp;<span class="number prw54353">0</span></span>`,
    `<span class="rateup btn btn-default"><a title="${escapeAttr(ctx.messages.text({ id: "rate.up", defaultMessage: "I like it" }))}" href="javascript:;">+</a></span>`,
    `<span class="ratedown btn btn-default"><a title="${escapeAttr(ctx.messages.text({ id: "rate.down", defaultMessage: "I don't like it" }))}" href="javascript:;">&#8211;</a></span>`,
    `<span class="cancel btn btn-default"><a title="${escapeAttr(ctx.messages.text({ id: "rate.cancel", defaultMessage: "Cancel my vote" }))}" href="javascript:;">x</a></span>`,
    "</div>",
  ];
}
