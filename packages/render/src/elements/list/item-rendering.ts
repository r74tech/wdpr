import type { ListData } from "@wdprlib/ast";
import { renderListAttrs } from "./attributes";

type ListItem = ListData["items"][number];
type SubListItem = Extract<ListItem, { "item-type": "sub-list" }>;

export function getListItemOpenTag(attributes: Record<string, string>): string {
  const styleAttr = hasNoMarker(attributes) ? ' style="list-style: none"' : "";
  return `<li${renderListAttrs(attributes)}${styleAttr}>`;
}

export function hasNoMarker(attributes: Record<string, string>): boolean {
  return attributes._noMarker === "true";
}

export function renderFollowingSubLists(
  items: ListData["items"],
  index: number,
  renderNestedList: (data: ListData) => void,
): number {
  let nextIndex = index;

  while (nextIndex + 1 < items.length) {
    const nextItem = getSubListItem(items[nextIndex + 1]);
    if (!nextItem) {
      break;
    }

    nextIndex++;
    renderNestedList(nextItem.data);
  }

  return nextIndex;
}

function getSubListItem(item: ListItem | undefined): SubListItem | null {
  return item?.["item-type"] === "sub-list" ? item : null;
}
