/**
 * Resolve @URL|default format with actual URL parameters.
 *
 * @param rawValue - The raw attribute value (e.g., "@URL|0")
 * @param paramName - The parameter name (e.g., "offset")
 * @param urlParams - Parsed URL parameters
 * @param prefix - Optional URL attribute prefix (e.g., "page2")
 * @returns Resolved value
 */
export function resolveUrlValue(
  rawValue: string | undefined,
  paramName: string,
  urlParams: Map<string, string>,
  prefix?: string,
): string | undefined {
  if (!rawValue) return undefined;

  if (!rawValue.startsWith("@URL")) {
    return rawValue;
  }

  const defaultValue = rawValue.includes("|") ? rawValue.split("|")[1] : undefined;
  const actualParamName = prefix ? `${prefix}_${paramName}` : paramName;
  return urlParams.get(actualParamName) ?? defaultValue;
}
