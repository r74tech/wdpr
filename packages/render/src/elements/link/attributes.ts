import type { LinkData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeAttr, isDangerousUrl } from "../../escape";
import { renderTargetAttributes } from "./target";

export function getLinkAttributes(ctx: RenderContext, data: LinkData): string[] {
  const attrs: string[] = [`href="${escapeAttr(resolveSafeHref(ctx, data))}"`];

  if (shouldAddNewPageClass(ctx, data)) {
    attrs.push(`class="newpage"`);
  }

  renderTargetAttributes(attrs, data.target);
  return attrs;
}

function resolveSafeHref(ctx: RenderContext, data: LinkData): string {
  let href = ctx.resolvePageLink(data.link);

  if (data.extra) {
    href += data.extra;
  }

  const isAnchorJsVoid = data.type === "anchor" && href === "javascript:;";
  if (!isAnchorJsVoid && isDangerousUrl(href)) {
    return "#invalid-url";
  }

  return href;
}

function shouldAddNewPageClass(ctx: RenderContext, data: LinkData): boolean {
  if (data.type !== "page" || typeof data.link !== "object") {
    return false;
  }

  if (data.link.site) {
    return false;
  }

  const page = data.link.page;
  const isSpecialPage = page.startsWith("//") || page.includes("#/");
  if (isSpecialPage) {
    return false;
  }

  const hashIdx = page.indexOf("#");
  const pageToCheck = hashIdx !== -1 ? page.slice(0, hashIdx) : page;
  const pageExists = ctx.page?.pageExists;
  return pageExists ? !pageExists(pageToCheck) : true;
}
