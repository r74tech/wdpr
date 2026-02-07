/**
 *
 * Renderer for `[[include page-name]]` transclusion elements.
 *
 * Includes are resolved by the parser before rendering: if the target
 * page exists, its parsed elements are injected into the AST. At render
 * time, the renderer either outputs the pre-resolved elements or shows
 * a Wikidot-compatible error message with a "create it now" link.
 *
 * @module
 */

import type { IncludeData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, escapeHtml } from "../escape";
import { renderElements } from "../render";

/**
 * Render an `[[include]]` element.
 *
 * If the include was resolved by the parser (i.e., `data.elements` is
 * non-empty), the resolved elements are rendered directly. Otherwise,
 * a Wikidot-compatible error block with a "create it now" link is shown.
 *
 * @param ctx - The current render context.
 * @param data - Include data with the target page location and resolved elements.
 */
export function renderInclude(ctx: RenderContext, data: IncludeData): void {
  // If elements is empty, the include was not resolved - show error
  if (data.elements.length === 0) {
    // Wikidot normalizes page names to lowercase
    const pageName = data.location.page.toLowerCase();
    // Encode page name for URL path (/ should not be encoded, but special chars should)
    const encodedPageName = pageName.replace(/[^a-z0-9\-_:/]/g, (c) => encodeURIComponent(c));
    // Prevent protocol-relative URLs
    const safePath = encodedPageName.startsWith("/") ? encodedPageName.slice(1) : encodedPageName;
    ctx.push(
      `<div class="error-block"><p>Included page "${escapeHtml(pageName)}" does not exist (<a href="/${escapeAttr(safePath)}/edit/true">create it now</a>)</p></div>`,
    );
    return;
  }
  renderElements(ctx, data.elements);
}
