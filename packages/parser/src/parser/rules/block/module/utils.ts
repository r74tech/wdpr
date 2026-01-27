/**
 * Parse boolean value from string
 * "yes" or "true" -> true
 * "no" or "false" -> false
 * Otherwise -> defaultValue
 */
export function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  if (value === "yes" || value === "true") return true;
  if (value === "no" || value === "false") return false;
  return defaultValue;
}

/**
 * Parse integer value from string
 */
export function parseInt32(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) ? undefined : num;
}
