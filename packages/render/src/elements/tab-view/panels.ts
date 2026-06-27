import type { TabData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderElements } from "../../render";
import { getTabPanelId } from "./ids";

export function renderTabPanels(ctx: RenderContext, tabs: TabData[], tabViewIndex: number): void {
  ctx.push(`<div class="yui-content">`);
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i]!;
    const displayStyle = i === 0 ? "" : ` style="display:none"`;
    ctx.push(`<div id="${getTabPanelId(ctx, tabViewIndex, i)}"${displayStyle}>`);
    renderElements(ctx, tab.elements);
    ctx.push("</div>");
  }
  ctx.push("</div>");
}
