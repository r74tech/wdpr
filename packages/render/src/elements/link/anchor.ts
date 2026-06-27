import type { AnchorData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeAttr, isDangerousUrl, sanitizeAttributes } from "../../escape";
import { renderElements } from "../../render";
import { renderTargetAttributes } from "./target";

export function renderAnchor(ctx: RenderContext, data: AnchorData): void {
  const safe = sanitizeAttributes(data.attributes);
  const attrs: string[] = [];

  if (safe.href && isDangerousUrl(safe.href)) {
    safe.href = "#invalid-url";
  }

  const href = safe.href ?? "";
  attrs.push(`href="${escapeAttr(href)}"`);
  renderTargetAttributes(attrs, data.target);

  for (const [key, value] of Object.entries(safe)) {
    if (key === "href" || key === "target") continue;
    attrs.push(`${key}="${escapeAttr(value)}"`);
  }

  ctx.push(`<a ${attrs.join(" ")}>`);
  renderElements(ctx, data.elements);
  ctx.push("</a>");
}
