import type { LinkData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeAttr, isDangerousUrl } from "../../escape";
import type { ResolvedPageLink } from "./page";
import { renderTargetAttributes } from "./target";

export function getLinkAttributes(
  ctx: RenderContext,
  data: LinkData,
  page: ResolvedPageLink | null,
): string[] {
  const attrs: string[] = [`href="${escapeAttr(resolveSafeHref(ctx, data))}"`];

  if (page && !page.exists) {
    attrs.push(`class="newpage"`);
  }

  renderTargetAttributes(attrs, data.target);
  return attrs;
}

function resolveSafeHref(ctx: RenderContext, data: LinkData): string {
  let href = ctx.resolvePageLink(data.link);
  if (data.type === "interwiki" && href.startsWith("wikipedia:")) {
    href = `http://en.wikipedia.org/wiki/${href.slice("wikipedia:".length)}`;
  }

  if (data.extra) {
    href += data.extra;
  }

  const isAnchorJsVoid = data.type === "anchor" && href === "javascript:;";
  if (!isAnchorJsVoid && isDangerousUrl(href)) {
    return "#invalid-url";
  }

  return href;
}
