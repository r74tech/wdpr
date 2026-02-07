/**
 * @module elements/module/page-tree
 *
 * Renderer for `[[module PageTree]]`.
 *
 * The PageTree module displays a hierarchical tree of child pages.
 * The renderer outputs an empty container div; the tree structure
 * is populated at runtime or via server-side rendering.
 */

import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

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
  ctx.push(`<div class="page-tree-module-box">`);
  ctx.push("</div>");
}
