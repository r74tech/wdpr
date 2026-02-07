/**
 * @module elements/link
 *
 * Renderers for Wikidot link elements.
 *
 * Wikidot supports several link syntaxes:
 * - `[[[page-name]]]` -- page link with automatic label
 * - `[[[page-name | label]]]` -- page link with custom label
 * - `[# label]` -- anchor-type link (JavaScript void)
 * - `[http://url label]` -- external URL link
 * - `[[a]]...[[/a]]` -- HTML anchor element with attributes
 * - `[[#anchor-name]]` -- named anchor (bookmark target)
 *
 * All link types are checked for dangerous URL schemes. Page links
 * may receive a `class="newpage"` attribute when the target page does
 * not exist (the standard Wikidot "red link" convention). External
 * links opened in new tabs automatically receive `rel="noopener noreferrer"`
 * to prevent tabnabbing.
 */

import type { LinkData, AnchorData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, isDangerousUrl, sanitizeAttributes } from "../escape";
import { renderElements } from "../render";

/**
 * Render a link element (`[[[page]]]`, `[url label]`, `[# label]`).
 *
 * The link's `href` is resolved via `ctx.resolvePageLink()`, with an
 * optional `extra` suffix (anchor fragment) appended. Anchor-type links
 * with `javascript:;` are allowed as a special case for Wikidot
 * compatibility; all other dangerous URL schemes are blocked.
 *
 * For page-type links, a `class="newpage"` is added when the
 * `pageExists` resolver indicates the target page does not exist.
 *
 * @param ctx - The current render context.
 * @param data - Link data with link target, label, type, target window, and extra suffix.
 */
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

  // Add "newpage" class for page links that don't exist
  // Only for page-type links (not direct URLs, anchors, etc.)
  if (data.type === "page" && typeof data.link === "object") {
    const page = data.link.page;
    // Skip newpage class for special pages:
    // - //path (protocol-relative or special routing)
    // - category pages (contain :)
    // - paths with #/ (hash routing like MAIN/#/page)
    const isSpecialPage = page.startsWith("//") || page.includes(":") || page.includes("#/");
    if (!isSpecialPage) {
      // For anchor links (page#anchor), check if the page part exists
      const hashIdx = page.indexOf("#");
      const pageToCheck = hashIdx !== -1 ? page.slice(0, hashIdx) : page;
      const pageExists = ctx.page?.pageExists;
      // If pageExists is not provided, assume page doesn't exist (show newpage class)
      const exists = pageExists ? pageExists(pageToCheck) : false;
      if (!exists) {
        attrs.push(`class="newpage"`);
      }
    }
  }

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
    // Prevent tabnabbing for _blank targets
    if (targetValue === "_blank") {
      attrs.push(`rel="noopener noreferrer"`);
    }
  }

  ctx.push(`<a ${attrs.join(" ")}>`);

  // Render label
  renderLinkLabel(ctx, data);

  ctx.push("</a>");
}

/**
 * Render the label content of a link element.
 *
 * Label types:
 * - `"page"` -- use the page name as the label text
 * - `{ text: string }` -- use a custom text label
 * - `{ url: string }` -- use the URL itself as the label
 *
 * @param ctx - The current render context.
 * @param data - Link data containing the label descriptor.
 */
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

/**
 * Render a `[[a]]...[[/a]]` anchor element with full attribute support.
 *
 * Unlike `renderLink`, this handles the block-level anchor syntax where
 * arbitrary attributes can be specified. Dangerous `href` values are
 * replaced with `#invalid-url`. The `target` attribute is mapped from
 * Wikidot's abstract values to HTML values, with tabnabbing protection.
 *
 * @param ctx - The current render context.
 * @param data - Anchor data with attributes, target, and child elements.
 */
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
    // Prevent tabnabbing for _blank targets
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

/**
 * Render a named anchor (bookmark target) element: `[[#anchor-name]]`.
 *
 * Produces `<a name="anchor-name"></a>` which serves as a link target
 * for `#anchor-name` URL fragments.
 *
 * @param ctx - The current render context.
 * @param name - The anchor name (fragment identifier).
 */
export function renderAnchorName(ctx: RenderContext, name: string): void {
  ctx.push(`<a name="${escapeAttr(name)}"></a>`);
}
