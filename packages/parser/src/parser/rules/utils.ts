/**
 * Common utilities shared between block and inline rules
 */

import type { ParseContext } from "./types";

// =============================================================================
// Attribute Safety
// =============================================================================

// Event handler attributes (on*) are blocked entirely
const SAFE_ATTRIBUTES = new Set([
  "accept",
  "align",
  "alt",
  "autocapitalize",
  "autoplay",
  "background",
  "bgcolor",
  "border",
  "buffered",
  "checked",
  "cite",
  "class",
  "cols",
  "colspan",
  "contenteditable",
  "controls",
  "coords",
  "datetime",
  "decoding",
  "default",
  "dir",
  "dirname",
  "disabled",
  "download",
  "draggable",
  "for",
  "form",
  "headers",
  "height",
  "hidden",
  "high",
  "href",
  "hreflang",
  "id",
  "inputmode",
  "ismap",
  "itemprop",
  "kind",
  "label",
  "lang",
  "list",
  "loop",
  "low",
  "max",
  "maxlength",
  "min",
  "minlength",
  "multiple",
  "muted",
  "name",
  "optimum",
  "pattern",
  "placeholder",
  "poster",
  "preload",
  "readonly",
  "required",
  "reversed",
  "role",
  "rows",
  "rowspan",
  "scope",
  "selected",
  "shape",
  "size",
  "sizes",
  "span",
  "spellcheck",
  "src",
  "srclang",
  "srcset",
  "start",
  "step",
  "style",
  "tabindex",
  "target",
  "title",
  "translate",
  "type",
  "usemap",
  "value",
  "width",
  "wrap",
]);

/**
 * Filter unsafe HTML attributes (blocks event handlers, allows safe attributes + aria-* / data-*)
 */
export function filterUnsafeAttributes(attrs: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    const lower = key.toLowerCase();
    if (lower.startsWith("on")) continue;
    if (lower.startsWith("aria-") || lower.startsWith("data-")) {
      result[key] = value;
      continue;
    }
    if (!SAFE_ATTRIBUTES.has(lower)) continue;
    // Wikidot prefixes user-set IDs with "u-"
    if (lower === "id") {
      result[key] = value.startsWith("u-") ? value : `u-${value}`;
      continue;
    }
    result[key] = value;
  }
  return result;
}

// =============================================================================
// Block Name Parsing
// =============================================================================

/**
 * Parse block name from tokens (handles [[name or [[/name)
 * Handles underscore suffix like "div_" which may be tokenized as [IDENTIFIER "div"] [UNDERSCORE "_"]
 */
export function parseBlockName(
  ctx: ParseContext,
  startPos: number,
): { name: string; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  // Skip whitespace
  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const token = ctx.tokens[pos];
  if (!token || (token.type !== "TEXT" && token.type !== "IDENTIFIER")) {
    return null;
  }

  // Base name
  let name = token.value.toLowerCase();
  consumed++;
  pos++;

  // Check for underscore suffix (e.g., "div_" -> "div" + "_")
  if (ctx.tokens[pos]?.type === "UNDERSCORE") {
    name += "_";
    consumed++;
  }

  return { name, consumed };
}
