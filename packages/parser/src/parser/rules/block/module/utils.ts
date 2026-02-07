/**
 *
 * Utility functions for parsing Wikidot module attribute values.
 *
 * Wikidot modules accept attributes as string key-value pairs. These utilities
 * convert common attribute types (booleans, integers) from their string
 * representation to proper TypeScript types, following Wikidot's conventions
 * for truthy/falsy values.
 *
 * @module
 */

/**
 * Parse a boolean value from a Wikidot attribute string.
 *
 * Wikidot accepts both "yes"/"no" and "true"/"false" as boolean attribute values.
 * If the value does not match any recognized boolean string, the default is returned.
 *
 * @param value - The attribute string value, or undefined if the attribute was not specified
 * @param defaultValue - Value to return when the attribute is undefined or unrecognized
 * @returns The parsed boolean value
 */
export function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  if (value === "yes" || value === "true") return true;
  if (value === "no" || value === "false") return false;
  return defaultValue;
}

/**
 * Parse a 32-bit integer value from a Wikidot attribute string.
 *
 * Uses base-10 parsing. Returns undefined for non-numeric strings or
 * when the attribute is not specified.
 *
 * @param value - The attribute string value, or undefined if not specified
 * @returns The parsed integer, or undefined if parsing fails
 */
export function parseInt32(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) ? undefined : num;
}
