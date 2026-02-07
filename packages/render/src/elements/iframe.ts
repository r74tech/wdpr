/**
 * @module elements/iframe
 *
 * Renderer for `[[iframe URL]]` inline iframe elements.
 *
 * Unlike `[[embed]]` blocks, `[[iframe]]` directly references a URL.
 * The URL is checked for dangerous schemes, and standard iframe
 * attributes (align, frameborder, height, etc.) are extracted from the
 * AST's attribute map and rendered with proper escaping.
 */

import type { IframeData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, isDangerousUrl, sanitizeStyleValue } from "../escape";

/**
 * Render an `[[iframe URL]]` element.
 *
 * The iframe is wrapped in a `<p>` element to match Wikidot's output.
 * Standard iframe attributes are rendered from the AST's attribute map,
 * with the `style` attribute sanitized against CSS injection. Dangerous
 * URL schemes are replaced with `#invalid-url`.
 *
 * @param ctx - The current render context.
 * @param data - Iframe data containing the URL and attribute map.
 */
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
