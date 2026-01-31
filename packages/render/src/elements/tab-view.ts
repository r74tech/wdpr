import type { TabData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";
import { syncHashMd5 } from "../hash";
import { renderElements } from "../render";

/** Render a tab-view element (Wikidot YUI-compatible) */
export function renderTabView(ctx: RenderContext, tabs: TabData[]): void {
  // Generate MD5 hash from tab labels
  const labelString = tabs.map((t) => t.label).join("");
  const hash = md5Hash(labelString);

  const widgetId = `wiki-tabview-${hash}`;

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
    const displayStyle = i === 0 ? "" : ` style="display: none"`;
    ctx.push(`<div id="wiki-tab-0-${i}"${displayStyle}>`);
    renderElements(ctx, tab.elements);
    ctx.push("</div>");
  }
  ctx.push("</div>");

  ctx.push("</div>"); // close yui-navset
}

function md5Hash(input: string): string {
  return syncHashMd5(input);
}
