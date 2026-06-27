import type { TabData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeHtml } from "../../escape";

export function renderTabNavigation(ctx: RenderContext, tabs: TabData[]): void {
  ctx.push(`<ul class="yui-nav">`);
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i]!;
    const selectedClass = i === 0 ? ` class="selected"` : "";
    ctx.push(`<li${selectedClass}>`);
    ctx.push(`<a href="javascript:;"><em>${escapeHtml(tab.label)}</em></a>`);
    ctx.push("</li>");
  }
  ctx.push("</ul>");
}
