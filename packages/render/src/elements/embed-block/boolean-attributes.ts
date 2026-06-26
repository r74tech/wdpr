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
 */
export function normalizeBooleanAttributes(html: string): string {
  let result = html;
  for (const attr of BOOLEAN_ATTRIBUTES) {
    const standalonePattern = new RegExp(`\\s${attr}(?=\\s|>|/>)`, "gi");
    result = result.replace(standalonePattern, ` ${attr}="${attr}"`);

    const emptyValuePattern = new RegExp(`\\s${attr}=""`, "gi");
    result = result.replace(emptyValuePattern, ` ${attr}="${attr}"`);
  }
  return result;
}
