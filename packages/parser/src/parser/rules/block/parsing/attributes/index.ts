import type { ParseContext } from "../../../types";
import { filterUnsafeAttributes } from "../../../common";
import { scanAttributes, type AttributeParseResult } from "./scanner";

/**
 * Parses HTML-style attributes from block opening tags.
 *
 * Supports quoted values, single-token unquoted values, boolean attributes,
 * and hyphenated names like `data-paragraph` or `aria-label`.
 *
 * Attribute names are lowercased. The result is filtered through
 * `filterUnsafeAttributes` to strip potentially dangerous HTML attributes.
 */
export function parseAttributes(ctx: ParseContext, startPos: number): AttributeParseResult {
  const result = scanAttributes(ctx, startPos, { hyphenatedNames: true, strikeHyphens: false });
  return { attrs: filterUnsafeAttributes(result.attrs), consumed: result.consumed };
}

/**
 * Parses attributes from block opening tags without safety filtering.
 *
 * Use this for block-specific parameters that are not emitted as HTML
 * attributes. Hyphenated name handling is configurable for legacy parser
 * contexts that need the first segment only.
 */
export function parseAttributesRaw(
  ctx: ParseContext,
  startPos: number,
  hyphenatedNames = true,
): AttributeParseResult {
  return scanAttributes(ctx, startPos, { hyphenatedNames, strikeHyphens: true });
}
