export function getRateWidgetParts(): string[] {
  return [
    `<div class="page-rate-widget-box">`,
    `<span class="rate-points">rating:&nbsp;<span class="number prw54353">0</span></span>`,
    `<span class="rateup btn btn-default"><a title="I like it" href="javascript:;">+</a></span>`,
    `<span class="ratedown btn btn-default"><a title="I don't like it" href="javascript:;">&#8211;</a></span>`,
    `<span class="cancel btn btn-default"><a title="Cancel my vote" href="javascript:;">x</a></span>`,
    "</div>",
  ];
}
