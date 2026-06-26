import { sanitizeStyleValue } from "./css";
import { SAFE_ATTRIBUTES, URL_ATTRIBUTES } from "./attribute-allowlists";
import { isDangerousUrl } from "./url";

/**
 * Check whether an HTML attribute name is safe to include in rendered output.
 *
 * The check applies three rules in order:
 * 1. Block all event handlers (`on*` prefix) unconditionally
 * 2. Allow accessibility (`aria-*`) and custom data (`data-*`) attributes
 * 3. Allow only attributes in the `SAFE_ATTRIBUTES` allowlist
 *
 * @param name - The attribute name to validate (case-insensitive).
 * @returns `true` if the attribute is safe to render.
 */
export function isSafeAttribute(name: string): boolean {
  const lower = name.toLowerCase();
  return isSafeAttributeLower(lower);
}

export function isSafeAttributeLower(lower: string): boolean {
  // Block all event handlers
  if (lower.startsWith("on")) return false;
  // Allow aria-* and data-* prefixes
  if (lower.startsWith("aria-") || lower.startsWith("data-")) return true;
  return SAFE_ATTRIBUTES.has(lower);
}

/**
 * Sanitize a map of HTML attributes, returning a new map containing
 * only entries that pass all safety checks.
 *
 * For each attribute, this function:
 * 1. Drops attributes that fail {@link isSafeAttribute} (event handlers, unknown names)
 * 2. Drops URL-bearing attributes whose values fail {@link isDangerousUrl}
 * 3. Sanitizes `style` values via {@link sanitizeStyleValue}, dropping them entirely
 *    if the result is empty
 * 4. Passes all other safe attributes through unchanged
 *
 * @param attributes - The raw attribute name-value map to sanitize.
 * @returns A new map containing only the safe attributes and their (possibly sanitized) values.
 */
export function sanitizeAttributes(attributes: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in attributes) {
    const value = attributes[key]!;
    const lower = key.toLowerCase();
    if (!isSafeAttributeLower(lower)) continue;
    // Check URL attributes for dangerous schemes
    if (URL_ATTRIBUTES.has(lower) && isDangerousUrl(value)) continue;
    // Sanitize style attribute
    if (lower === "style") {
      const sanitized = sanitizeStyleValue(value);
      if (sanitized) {
        result[key] = sanitized;
      }
      continue;
    }
    result[key] = value;
  }
  return result;
}
