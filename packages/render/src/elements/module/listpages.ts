/**
 * @module elements/module/listpages
 *
 * Renderer for `[[module ListPages]]`.
 *
 * The ListPages module queries and displays a filtered list of wiki pages.
 * Because the query results require server-side data, the renderer outputs
 * an empty container div that can be populated at runtime.
 */

import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

/**
 * Render a `[[module ListPages]]` element as an empty container.
 *
 * @param ctx - The current render context.
 * @param _data - ListPages module data (unused; the container is always empty).
 */
export function renderListPages(
  ctx: RenderContext,
  _data: Extract<Module, { module: "list-pages" }>,
): void {
  ctx.push(`<div class="list-pages-box">`);
  ctx.push("</div>");
}
