/**
 *
 * Renderer for `[[module ListPages]]`.
 *
 * The ListPages module queries and displays a filtered list of wiki pages.
 * Because the query results require server-side data, the renderer outputs
 * an empty container div that can be populated at runtime.
 *
 * @module
 */

import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderEmptyModuleContainer } from "./empty-container";

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
  renderEmptyModuleContainer(ctx, "list-pages-box");
}
