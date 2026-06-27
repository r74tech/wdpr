/**
 *
 * Renderer for `[[module Categories]]`.
 *
 * The categories module displays the site's page categories. The
 * renderer outputs an empty container div; category data is populated
 * at runtime or via server-side rendering.
 *
 * @module
 */

import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderEmptyModuleContainer } from "./empty-container";

/**
 * Render a `[[module Categories]]` element as an empty container.
 *
 * @param ctx - The current render context.
 * @param _data - Categories module data (unused; the container is always empty).
 */
export function renderCategories(
  ctx: RenderContext,
  _data: Extract<Module, { module: "categories" }>,
): void {
  renderEmptyModuleContainer(ctx, "categories-module-box");
}
