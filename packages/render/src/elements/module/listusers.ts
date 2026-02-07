/**
 *
 * Renderer for `[[module ListUsers]]`.
 *
 * The ListUsers module displays a filtered list of site members.
 * The renderer outputs an empty container div that can be populated
 * at runtime or via server-side rendering.
 *
 * @module
 */

import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

/**
 * Render a `[[module ListUsers]]` element as an empty container.
 *
 * @param ctx - The current render context.
 * @param _data - ListUsers module data (unused; the container is always empty).
 */
export function renderListUsers(
  ctx: RenderContext,
  _data: Extract<Module, { module: "list-users" }>,
): void {
  ctx.push(`<div class="list-users-module-box">`);
  ctx.push("</div>");
}
