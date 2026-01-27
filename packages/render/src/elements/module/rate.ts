import type { RenderContext } from "../../context";

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
