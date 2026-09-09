/**
 *
 * Renderer for `[[module Join]]`.
 *
 * The Join module displays a button that allows users to request
 * membership in the wiki site. The button text can be customized
 * via the `button-text` attribute; it defaults to "Join".
 *
 * @module
 */

import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderJoinMarkup } from "./join-markup";

/**
 * Render a `[[module Join]]` element with a clickable join button.
 *
 * The button is wrapped in a `<div>` with a configurable CSS class
 * (defaults to `"join-box"`). The runtime `join` module attaches
 * click handling via the `onJoin` callback.
 *
 * @param ctx - The current render context.
 * @param data - Join module data with optional `button-text` and CSS class.
 */
export function renderJoin(ctx: RenderContext, data: Extract<Module, { module: "join" }>): void {
  ctx.push(renderJoinMarkup(ctx, data));
}
