import type { IncludeData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";
import { renderElements } from "../render";

/** Render include - renders resolved elements or error if not resolved */
export function renderInclude(ctx: RenderContext, data: IncludeData): void {
  // If elements is empty, the include was not resolved - show error
  if (data.elements.length === 0) {
    // Wikidot normalizes page names to lowercase
    const pageName = data.location.page.toLowerCase();
    ctx.push(
      `<div class="error-block"><p>Included page "${escapeHtml(pageName)}" does not exist (<a href="/${escapeHtml(pageName)}/edit/true">create it now</a>)</p></div>`,
    );
    return;
  }
  renderElements(ctx, data.elements);
}
