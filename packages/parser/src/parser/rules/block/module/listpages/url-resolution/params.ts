import { URL_RESOLVABLE_FIELDS } from "./fields";

/**
 * Parse URL path parameters like /offset/1/page2_limit/1.
 * Returns a map of parameter name -> value. Set hasPageName for a full page path;
 * otherwise the legacy parameter-only-path heuristic is used.
 */
export function parseUrlParams(url: string, hasPageName = false): Map<string, string> {
  const params = new Map<string, string>();
  const parts = url.split(/[?#]/, 1)[0]!.split("/").filter(Boolean);
  const pairStart = !hasPageName && isUrlParameter(parts[0]) ? 0 : 1;

  // Skip the page name (first part), parse key/value pairs.
  for (let i = pairStart; i < parts.length - 1; i += 2) {
    const key = parts[i];
    const value = parts[i + 1];
    if (key && value) {
      params.set(key, value);
    }
  }

  return params;
}

const URL_PARAMETER_NAMES = new Set(
  URL_RESOLVABLE_FIELDS.flatMap((field) => [field.attr, ...(field.urlAttrs ?? [])]),
);

function isUrlParameter(param: string | undefined): boolean {
  return param !== undefined && URL_PARAMETER_NAMES.has(param);
}
