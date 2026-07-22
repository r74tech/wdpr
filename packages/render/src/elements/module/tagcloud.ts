/**
 *
 * Renderer for `[[module TagCloud]]`.
 *
 * The TagCloud module displays a weighted cloud of page tags. When tag data
 * is supplied during the resolution phase (via `DataProvider.fetchTagCloud`),
 * the module is expanded into concrete elements before rendering. This
 * renderer handles the unresolved case by outputting an empty container div
 * that can be populated at runtime or via server-side rendering.
 *
 * @module
 */

import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderEmptyModuleContainer } from "./empty-container";

/**
 * Render an unresolved `[[module TagCloud]]` element as an empty container.
 *
 * @param ctx - The current render context.
 * @param _data - TagCloud module data (unused; the container is always empty).
 */
export function renderTagCloud(
  ctx: RenderContext,
  _data: Extract<Module, { module: "tag-cloud" }>,
): void {
  renderEmptyModuleContainer(ctx, "pages-tag-cloud-box");
}
