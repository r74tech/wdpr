import type { TabData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { syncHashMd5 } from "../../hash";

export function getTabViewWidgetId(
  ctx: RenderContext,
  tabs: TabData[],
  tabViewIndex: number,
): string {
  const labelString = tabs.map((tab) => tab.label).join("");
  return ctx.generateFixedId(`wiki-tabview-${tabViewIndex}-${syncHashMd5(labelString)}`);
}

export function getTabPanelId(ctx: RenderContext, tabViewIndex: number, tabIndex: number): string {
  return ctx.generateId(`wiki-tab-${tabViewIndex}-`, tabIndex);
}
