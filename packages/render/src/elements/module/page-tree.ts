/**
 *
 * Renderer for `[[module PageTree]]`.
 *
 * The PageTree module displays a hierarchical tree of child pages.
 * The renderer outputs an empty container div; the tree structure
 * is populated at runtime or via server-side rendering.
 *
 * @module
 */

import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderEmptyModuleContainer } from "./empty-container";

/**
 * Render a `[[module PageTree]]` element as an empty container.
 *
 * @param ctx - The current render context.
 * @param _data - PageTree module data (unused; the container is always empty).
 */
export function renderPageTree(
  ctx: RenderContext,
  _data: Extract<Module, { module: "page-tree" }>,
): void {
  renderEmptyModuleContainer(ctx, "page-tree-module-box");
}
