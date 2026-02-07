/**
 * @module elements/tab-view
 *
 * Renderer for `[[tabview]]...[[/tabview]]` tab containers.
 *
 * Wikidot uses a YUI-compatible tabview widget. The rendered HTML follows
 * the YUI class naming convention (`yui-navset`, `yui-nav`, `yui-content`)
 * and uses inline `display` styles for tab visibility. Tab switching is
 * handled at runtime by the `tabview` runtime module.
 *
 * A deterministic widget ID is generated from an MD5-length hash of the
 * concatenated tab labels, ensuring stable IDs across renders.
 */

import type { TabData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";
import { syncHashMd5 } from "../hash";
import { renderElements } from "../render";

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
  // Generate MD5 hash from tab labels
  const labelString = tabs.map((t) => t.label).join("");
  const hash = md5Hash(labelString);

  const widgetId = ctx.generateFixedId(`wiki-tabview-${hash}`);

  // Container
  ctx.push(`<div id="${widgetId}" class="yui-navset">`);

  // Navigation tabs
  ctx.push(`<ul class="yui-nav">`);
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i]!;
    const selectedClass = i === 0 ? ` class="selected"` : "";
    ctx.push(`<li${selectedClass}>`);
    ctx.push(`<a href="javascript:;"><em>${escapeHtml(tab.label)}</em></a>`);
    ctx.push("</li>");
  }
  ctx.push("</ul>");

  // Content panels
  ctx.push(`<div class="yui-content">`);
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i]!;
    const displayStyle = i === 0 ? "" : ` style="display:none"`;
    const tabId = ctx.generateId("wiki-tab-0-", i);
    ctx.push(`<div id="${tabId}"${displayStyle}>`);
    renderElements(ctx, tab.elements);
    ctx.push("</div>");
  }
  ctx.push("</div>");

  ctx.push("</div>"); // close yui-navset
}

/**
 * Compute an MD5-length hash of the input string for widget ID generation.
 *
 * @param input - String to hash (typically concatenated tab labels).
 * @returns A 32-character hex hash string.
 */
function md5Hash(input: string): string {
  return syncHashMd5(input);
}
