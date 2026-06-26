import { normalizeCssValue } from "./css-normalize";
import { isCssUrlAllowed, iterateCssUrls } from "./css-urls";

/**
 * Check whether a CSS property value contains dangerous patterns that
 * could enable script execution or disallowed external resource loading.
 */
export function isDangerousCssValue(value: string): boolean {
  const normalized = normalizeCssValue(value);

  for (const { inner, malformed } of iterateCssUrls(normalized)) {
    if (malformed) return true;
    if (!isCssUrlAllowed(inner)) return true;
  }

  if (normalized.includes("expression(")) return true;
  if (normalized.includes("-moz-binding")) return true;
  if (normalized.includes("behavior:")) return true;
  if (normalized.includes("@import")) return true;

  return false;
}
