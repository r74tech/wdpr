import type { IncludeData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, escapeHtml } from "../escape";
import { renderElements } from "../render";

/** Render include - renders resolved elements or error if not resolved */
export function renderInclude(ctx: RenderContext, data: IncludeData): void {
  // If elements is empty, the include was not resolved - show error
  if (data.elements.length === 0) {
    // Wikidot normalizes page names to lowercase
    const pageName = data.location.page.toLowerCase();
    // Encode page name for URL path (/ should not be encoded, but special chars should)
    const encodedPageName = pageName.replace(/[^a-z0-9\-_:\/]/g, (c) => encodeURIComponent(c));
    // Prevent protocol-relative URLs
    const safePath = encodedPageName.startsWith("/") ? encodedPageName.slice(1) : encodedPageName;
    ctx.push(
      `<div class="error-block"><p>Included page "${escapeHtml(pageName)}" does not exist (<a href="/${escapeAttr(safePath)}/edit/true">create it now</a>)</p></div>`,
    );
    return;
  }
  renderElements(ctx, data.elements);
}
