/**
 *
 * Renderer for `[[tabview]]...[[/tabview]]` tab containers.
 *
 * @module
 */

import type { TabData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderTabPanels } from "./panels";
import { renderTabNavigation } from "./navigation";
import { getTabViewWidgetId } from "./ids";

/**
 * Render a `[[tabview]]` element with YUI-compatible HTML structure.
 *
 * The first tab is selected by default (visible, with the `selected` class
 * on its nav item). All other tabs have `display:none` on their content divs.
 *
 * @param ctx - The current render context.
 * @param tabs - Array of tab data, each with a label and child elements.
 */
export function renderTabView(ctx: RenderContext, tabs: TabData[]): void {
  const tabViewIndex = ctx.nextTabViewIndex();
  const widgetId = getTabViewWidgetId(ctx, tabs, tabViewIndex);

  ctx.push(`<div id="${widgetId}" class="yui-navset">`);
  renderTabNavigation(ctx, tabs);
  renderTabPanels(ctx, tabs, tabViewIndex);
  ctx.push("</div>");
}
