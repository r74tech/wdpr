const BOOLEAN_ATTRIBUTES = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "novalidate",
  "open",
  "readonly",
  "required",
  "reversed",
  "selected",
];

/**
 * Normalize HTML boolean attributes to Wikidot's `attr="attr"` format.
 *
 * Works on the parsed attribute map, before sanitize-html serializes and escapes each value.
 * Rewriting the serialized HTML instead would let text inside a value be read as a new attribute.
 */
export function normalizeBooleanAttributes(
  attribs: Record<string, string>,
): Record<string, string> {
  const result = { ...attribs };
  for (const attr of BOOLEAN_ATTRIBUTES) {
    if (result[attr] === "") {
      result[attr] = attr;
    }
  }
  return result;
}
