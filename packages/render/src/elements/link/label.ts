import type { LinkData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

export function renderLinkLabel(ctx: RenderContext, data: LinkData): void {
  if (data.label === "page") {
    if (typeof data.link === "string") {
      ctx.pushEscaped(data.link);
    } else {
      ctx.pushEscaped(data.link.page);
    }
    return;
  }

  if ("text" in data.label) {
    ctx.pushEscaped(data.label.text);
    return;
  }

  if ("url" in data.label) {
    const href = ctx.resolvePageLink(data.link);
    ctx.pushEscaped(data.label.url ?? href);
  }
}
