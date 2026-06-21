import type { DefinitionListItem, Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseDefinitionItemKey } from "./item-key";
import { parseDefinitionItemValue } from "./item-value";

/**
 * Internal representation of one definition list item before conversion
 * to the AST's DefinitionListItem format.
 */
export interface ParsedDefinitionItem {
  /** Raw string of the key, used for `key_string` in the AST. */
  keyString: string;
  /** Parsed inline elements representing the key / term. */
  key: Element[];
  /** Parsed inline elements representing the value / definition. */
  value: Element[];
}

/**
 * Parses a single definition list entry of the form `: key : value`.
 *
 * The function expects `startPos` to point at a line-start COLON token.
 * It consumes the first colon, mandatory whitespace, key tokens up to
 * the second colon, then value tokens until a double newline, a new entry,
 * or end of input.
 */
export function parseDefinitionItem(
  ctx: ParseContext,
  startPos: number,
): { item: ParsedDefinitionItem; consumed: number } | null {
  const keyResult = parseDefinitionItemKey(ctx, startPos);
  if (!keyResult) {
    return null;
  }

  const valueResult = parseDefinitionItemValue(ctx, startPos + keyResult.consumed);

  return {
    item: {
      keyString: keyResult.keyString,
      key: keyResult.key,
      value: valueResult.value,
    },
    consumed: keyResult.consumed + valueResult.consumed,
  };
}

export function toDefinitionListItems(items: ParsedDefinitionItem[]): DefinitionListItem[] {
  return items.map((item) => ({
    key_string: item.keyString,
    key: item.key,
    value: item.value,
  }));
}
