import type { Element, TabData } from "@wdprlib/ast";

export function mapTabs(tabs: TabData[], transform: (elements: Element[]) => Element[]): TabData[] {
  return tabs.map((tab) => ({ ...tab, elements: transform(tab.elements) }));
}
