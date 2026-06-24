/**
 * Parse URL path parameters like /offset/1/page2_limit/1.
 * Returns a map of parameter name -> value.
 */
export function parseUrlParams(url: string): Map<string, string> {
  const params = new Map<string, string>();
  const parts = url.split("/").filter(Boolean);

  // Skip the page name (first part), parse key/value pairs.
  for (let i = 1; i < parts.length - 1; i += 2) {
    const key = parts[i];
    const value = parts[i + 1];
    if (key && value) {
      params.set(key, value);
    }
  }

  return params;
}
