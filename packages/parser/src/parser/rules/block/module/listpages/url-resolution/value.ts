/**
 * Resolve @URL|default format with actual URL parameters.
 *
 * @param rawValue - The raw attribute value (e.g., "@URL|0")
 * @param paramNames - The parameter name or names (e.g., "offset")
 * @param urlParams - Parsed URL parameters
 * @param prefix - Optional URL attribute prefix (e.g., "page2")
 * @returns Resolved value
 */
export function resolveUrlValue(
  rawValue: string | undefined,
  paramNames: string | readonly string[],
  urlParams: Map<string, string>,
  prefix?: string,
): string | undefined {
  if (!rawValue) return undefined;

  if (!rawValue.startsWith("@URL")) {
    return rawValue;
  }

  const defaultValue = rawValue.includes("|") ? rawValue.split("|")[1] : undefined;
  for (const paramName of toParamNames(paramNames)) {
    const actualParamName = prefix ? `${prefix}_${paramName}` : paramName;
    const value = urlParams.get(actualParamName);
    if (value !== undefined) return value;
  }

  return defaultValue;
}

function toParamNames(paramNames: string | readonly string[]): readonly string[] {
  return typeof paramNames === "string" ? [paramNames] : paramNames;
}
