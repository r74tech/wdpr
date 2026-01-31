import type { IframeData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, isDangerousUrl, sanitizeStyleValue } from "../escape";

/** Render iframe element */
export function renderIframe(ctx: RenderContext, data: IframeData): void {
  const url = isDangerousUrl(data.url) ? "#invalid-url" : data.url;
  const attrs: string[] = [`src="${escapeAttr(url)}"`];

  // Standard iframe attributes from the attributes map
  const iframeAttrs = ["align", "frameborder", "height", "scrolling", "width", "class", "style"];
  for (const attr of iframeAttrs) {
    let value = data.attributes[attr] ?? "";
    // Sanitize style attribute to prevent CSS injection
    if (attr === "style") {
      value = sanitizeStyleValue(value);
    }
    attrs.push(`${attr}="${escapeAttr(value)}"`);
  }

  ctx.push(`<p><iframe ${attrs.join(" ")}></iframe></p>`);
}
