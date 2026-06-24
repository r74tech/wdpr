import type { ListPagesDataRequirement, ListPagesQuery, NormalizedListPagesQuery } from "../types";
import { normalizeQuery } from "../normalize";
import { URL_RESOLVABLE_FIELDS } from "./fields";
import { assignResolvedUrlField } from "./query";
import { resolveUrlValue } from "./value";

/**
 * Resolve all `@URL` parameters and build a ListPagesQuery.
 *
 * Takes a ListPagesDataRequirement and URL parameters, resolves all `@URL|default`
 * values, and returns a complete ListPagesQuery ready for database queries.
 *
 * @param requirement - The data requirement from AST extraction
 * @param urlParams - Parsed URL parameters (from parseUrlParams)
 * @returns Resolved ListPagesQuery
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

    assignResolvedUrlField(resolved, field, resolvedValue);
  }

  return resolved;
}

/**
 * Resolve all `@URL` parameters and normalize the query.
 *
 * Combines URL resolution with query normalization in a single call.
 * This is the recommended way to process ListPages queries for HPC.
 *
 * @param requirement - The data requirement from AST extraction
 * @param urlParams - Parsed URL parameters (from parseUrlParams)
 * @returns Normalized query with all `@URL` values resolved
 */
export function resolveAndNormalizeQuery(
  requirement: ListPagesDataRequirement,
  urlParams: Map<string, string>,
): NormalizedListPagesQuery {
  const resolved = resolveQuery(requirement, urlParams);
  return normalizeQuery(resolved);
}
