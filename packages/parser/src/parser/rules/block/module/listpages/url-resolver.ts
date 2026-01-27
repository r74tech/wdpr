/**
 * URL parameter resolver for @URL|default format
 *
 * Resolves wikidot's @URL parameter syntax used in ListPages modules.
 * This enables HPC (Hyper Page Changer) style multi-page content.
 */

import type { ListPagesDataRequirement, ListPagesQuery, NormalizedListPagesQuery } from "./types";
import { normalizeQuery } from "./normalize";

/**
 * Fields that support @URL resolution with their attribute names
 * Maps rawAttribute key -> ListPagesQuery key
 */
const URL_RESOLVABLE_FIELDS: ReadonlyArray<{
  attr: string;
  queryKey: keyof ListPagesQuery;
  type: "string" | "number" | "boolean";
}> = [
  { attr: "offset", queryKey: "offset", type: "number" },
  { attr: "limit", queryKey: "limit", type: "number" },
  { attr: "per-page", queryKey: "perPage", type: "number" },
  { attr: "order", queryKey: "order", type: "string" },
  { attr: "tags", queryKey: "tags", type: "string" },
  { attr: "category", queryKey: "category", type: "string" },
  { attr: "parent", queryKey: "parent", type: "string" },
  { attr: "range", queryKey: "range", type: "string" },
  { attr: "name", queryKey: "name", type: "string" },
  { attr: "fullname", queryKey: "fullname", type: "string" },
  { attr: "created-at", queryKey: "createdAt", type: "string" },
  { attr: "updated-at", queryKey: "updatedAt", type: "string" },
  { attr: "created-by", queryKey: "createdBy", type: "string" },
  { attr: "rating", queryKey: "rating", type: "string" },
  { attr: "votes", queryKey: "votes", type: "string" },
  { attr: "reverse", queryKey: "reverse", type: "boolean" },
];

/**
 * Parse URL path parameters like /offset/1/page2_limit/1
 * Returns a map of parameter name -> value
 */
export function parseUrlParams(url: string): Map<string, string> {
  const params = new Map<string, string>();
  const parts = url.split("/").filter(Boolean);

  // Skip the page name (first part), parse key/value pairs
  for (let i = 1; i < parts.length - 1; i += 2) {
    const key = parts[i];
    const value = parts[i + 1];
    if (key && value) {
      params.set(key, value);
    }
  }

  return params;
}

/**
 * Resolve @URL|default format with actual URL parameters
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

  // Check for @URL or @URL|default format
  if (!rawValue.startsWith("@URL")) {
    return rawValue;
  }

  // Extract default value if present
  const defaultValue = rawValue.includes("|") ? rawValue.split("|")[1] : undefined;

  // Build the actual parameter name with prefix
  const actualParamName = prefix ? `${prefix}_${paramName}` : paramName;

  // Get from URL params or use default
  return urlParams.get(actualParamName) ?? defaultValue;
}

/**
 * Resolve all @URL parameters and build a ListPagesQuery
 *
 * Takes a ListPagesDataRequirement and URL parameters, resolves all @URL|default
 * values, and returns a complete ListPagesQuery ready for database queries.
 *
 * @param requirement - The data requirement from AST extraction
 * @param urlParams - Parsed URL parameters (from parseUrlParams)
 * @returns Resolved ListPagesQuery
 *
 * @example
 * ```typescript
 * const urlParams = parseUrlParams("/page/scp-001/page2_offset/10/page2_limit/5");
 * const query = resolveQuery(requirement, urlParams);
 * // query.offset = 10, query.limit = 5 (if urlAttrPrefix = "page2")
 * ```
 */
export function resolveQuery(
  requirement: ListPagesDataRequirement,
  urlParams: Map<string, string>,
): ListPagesQuery {
  const { query, rawAttributes, urlAttrPrefix } = requirement;
  const resolved: ListPagesQuery = { ...query };

  for (const field of URL_RESOLVABLE_FIELDS) {
    const rawValue = rawAttributes[field.attr];
    if (!rawValue) continue;

    const resolvedValue = resolveUrlValue(rawValue, field.attr, urlParams, urlAttrPrefix);
    if (resolvedValue === undefined) continue;

    // Convert to appropriate type
    switch (field.type) {
      case "number": {
        const num = parseInt(resolvedValue, 10);
        if (!Number.isNaN(num)) {
          (resolved as Record<string, unknown>)[field.queryKey] = num;
        }
        break;
      }
      case "boolean":
        (resolved as Record<string, unknown>)[field.queryKey] =
          resolvedValue === "true" || resolvedValue === "yes" || resolvedValue === "1";
        break;
      case "string":
      default:
        (resolved as Record<string, unknown>)[field.queryKey] = resolvedValue;
        break;
    }
  }

  return resolved;
}

/**
 * Resolve all @URL parameters and normalize the query
 *
 * Combines URL resolution with query normalization in a single call.
 * This is the recommended way to process ListPages queries for HPC.
 *
 * @param requirement - The data requirement from AST extraction
 * @param urlParams - Parsed URL parameters (from parseUrlParams)
 * @returns Normalized query with all @URL values resolved
 *
 * @example
 * ```typescript
 * const urlParams = parseUrlParams(window.location.pathname);
 * const normalizedQuery = resolveAndNormalizeQuery(requirement, urlParams);
 * // Ready for database query building
 * ```
 */
export function resolveAndNormalizeQuery(
  requirement: ListPagesDataRequirement,
  urlParams: Map<string, string>,
): NormalizedListPagesQuery {
  const resolved = resolveQuery(requirement, urlParams);
  return normalizeQuery(resolved);
}
