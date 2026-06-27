import type { DefinitionListItem, Element } from "@wdprlib/ast";

export function mapDefinitionListItems(
  items: DefinitionListItem[],
  transform: (elements: Element[]) => Element[],
): DefinitionListItem[] {
  return items.map((item) => ({
    key_string: item.key_string,
    key: transform(item.key),
    value: transform(item.value),
  }));
}
