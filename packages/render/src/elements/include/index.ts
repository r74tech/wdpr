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
import type { RenderContext } from "../../context";
import { renderElements } from "../../render";
import { renderMissingInclude } from "./missing";

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
  if (data.elements.length === 0) {
    renderMissingInclude(ctx, data.location.page);
    return;
  }

  renderElements(ctx, data.elements);
}
