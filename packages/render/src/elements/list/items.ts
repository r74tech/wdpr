import type { ListData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderElements } from "../../render";
import { getListItemOpenTag, hasNoMarker, renderFollowingSubLists } from "./item-rendering";
import { renderNoMarkerElements } from "./no-marker";
import { trimTextElements } from "./trim";

type ListItem = ListData["items"][number];
type ElementsListItem = Extract<ListItem, { "item-type": "elements" }>;
type SubListItem = Extract<ListItem, { "item-type": "sub-list" }>;

export type NestedListRenderer = (ctx: RenderContext, data: ListData) => void;

export function renderListItems(
  ctx: RenderContext,
  items: ListData["items"],
  renderNestedList: NestedListRenderer,
): void {
  let i = 0;
  while (i < items.length) {
    const item = items[i]!;
    if (item["item-type"] === "elements") {
      i = renderElementsListItem(ctx, item, items, i, renderNestedList);
    } else {
      renderOrphanSubListItem(ctx, item, renderNestedList);
    }
    i++;
  }
}

function renderElementsListItem(
  ctx: RenderContext,
  item: ElementsListItem,
  items: ListData["items"],
  index: number,
  renderNestedList: NestedListRenderer,
): number {
  const noMarker = hasNoMarker(item.attributes);
  ctx.push(getListItemOpenTag(item.attributes));

  if (noMarker) {
    renderNoMarkerElements(ctx, item.elements);
  } else {
    renderElements(ctx, trimTextElements(item.elements));
  }

  const nextIndex = renderFollowingSubLists(items, index, (data) => renderNestedList(ctx, data));

  ctx.push("</li>");
  return nextIndex;
}

function renderOrphanSubListItem(
  ctx: RenderContext,
  item: SubListItem,
  renderNestedList: NestedListRenderer,
): void {
  ctx.push(`<li style="list-style: none; display: inline">`);
  renderNestedList(ctx, item.data);
  ctx.push("</li>");
}
