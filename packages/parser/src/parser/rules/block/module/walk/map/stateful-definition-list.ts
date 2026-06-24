import type { DefinitionListItem, Element } from "@wdprlib/ast";
import type { StatefulTransformResult } from "./types";

export function mapDefinitionListItemsWithState<S>(
  items: DefinitionListItem[],
  state: S,
  transform: (elements: Element[], state: S) => StatefulTransformResult<S>,
): { items: DefinitionListItem[]; state: S } {
  const newItems: DefinitionListItem[] = [];
  let currentState = state;

  for (const item of items) {
    const keyResult = transform(item.key, currentState);
    currentState = keyResult.state;
    const valueResult = transform(item.value, currentState);
    currentState = valueResult.state;
    newItems.push({
      key_string: item.key_string,
      key: keyResult.elements,
      value: valueResult.elements,
    });
  }

  return { items: newItems, state: currentState };
}
