import type { Element, TabData } from "@wdprlib/ast";
import type { StatefulTransformResult } from "./types";

export function mapTabsWithState<S>(
  tabs: TabData[],
  state: S,
  transform: (elements: Element[], state: S) => StatefulTransformResult<S>,
): { tabs: TabData[]; state: S } {
  const newTabs: TabData[] = [];
  let currentState = state;

  for (const tab of tabs) {
    const result = transform(tab.elements, currentState);
    newTabs.push({ ...tab, elements: result.elements });
    currentState = result.state;
  }

  return { tabs: newTabs, state: currentState };
}
