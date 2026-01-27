import type { LinkData, AnchorData } from "@wdpr/ast";
import type { RenderContext } from "../context";
import { escapeAttr, isDangerousUrl, sanitizeAttributes } from "../escape";
import { renderElements } from "../render";

/** Render a link element */
export function renderLink(ctx: RenderContext, data: LinkData): void {
  let href = ctx.resolvePageLink(data.link);

  // Append extra (anchor suffix)
  if (data.extra) {
    href += data.extra;
  }

  // Validate URL scheme
  // Exception: anchor-type links with "javascript:;" are valid Wikidot syntax ([# label])
  const isAnchorJsVoid = data.type === "anchor" && href === "javascript:;";
  if (!isAnchorJsVoid && isDangerousUrl(href)) {
    href = "#invalid-url";
  }

  // Build <a> tag
  const attrs: string[] = [`href="${escapeAttr(href)}"`];

  // Target attribute
  if (data.target) {
    const targetMap: Record<string, string> = {
      "new-tab": "_blank",
      parent: "_parent",
      top: "_top",
      same: "_self",
    };
    const targetValue = targetMap[data.target] ?? "_blank";
    attrs.push(`target="${targetValue}"`);
    if (targetValue === "_blank") {
      attrs.push(`rel="noopener noreferrer"`);
    }
  }

  ctx.push(`<a ${attrs.join(" ")}>`);

  // Render label
  renderLinkLabel(ctx, data);

  ctx.push("</a>");
}

function renderLinkLabel(ctx: RenderContext, data: LinkData): void {
  if (data.label === "page") {
    // Use page name as label
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
    // Use the URL itself as label
    const href = ctx.resolvePageLink(data.link);
    ctx.pushEscaped(data.label.url ?? href);
  }
}

/** Render an anchor element */
export function renderAnchor(ctx: RenderContext, data: AnchorData): void {
  const safe = sanitizeAttributes(data.attributes);
  const attrs: string[] = [];

  // Validate href for dangerous URLs
  if (safe.href && isDangerousUrl(safe.href)) {
    safe.href = "#invalid-url";
  }

  // Always include href attribute
  const href = safe.href ?? "";
  attrs.push(`href="${escapeAttr(href)}"`);

  // Handle target attribute from AST data
  if (data.target) {
    const targetMap: Record<string, string> = {
      "new-tab": "_blank",
      parent: "_parent",
      top: "_top",
      same: "_self",
    };
    const targetValue = targetMap[data.target] ?? "_blank";
    attrs.push(`target="${targetValue}"`);
    if (targetValue === "_blank") {
      attrs.push(`rel="noopener noreferrer"`);
    }
  }

  for (const [key, value] of Object.entries(safe)) {
    if (key === "href" || key === "target") continue; // already handled above
    attrs.push(`${key}="${escapeAttr(value)}"`);
  }

  ctx.push(`<a ${attrs.join(" ")}>`);
  renderElements(ctx, data.elements);
  ctx.push("</a>");
}

/** Render an anchor-name element */
export function renderAnchorName(ctx: RenderContext, name: string): void {
  ctx.push(`<a name="${escapeAttr(name)}"></a>`);
}
