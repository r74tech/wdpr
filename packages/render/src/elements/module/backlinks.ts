/**
 *
 * Renderer for `[[module Backlinks]]`.
 *
 * The backlinks module lists all pages that link to the current page.
 * Because backlink data requires server-side queries, the renderer only
 * outputs an empty container div. The actual content is populated at
 * runtime or via server-side rendering.
 *
 * @module
 */

import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

/**
 * Render a `[[module Backlinks]]` element as an empty container.
 *
 * @param ctx - The current render context.
 * @param _data - Backlinks module data (unused; the container is always empty).
 */
export function renderBacklinks(
  ctx: RenderContext,
  _data: Extract<Module, { module: "backlinks" }>,
): void {
  // Wikidot outputs just the container div (backlinks are populated at runtime)
  ctx.push(`<div class="backlinks-module-box">\n\t</div>`);
}
