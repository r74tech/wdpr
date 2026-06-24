import type { ListPagesDataRequirement } from "./data-requirements";
import type { ListPagesExternalData } from "./external-data";
import type { NormalizedListPagesQuery } from "./normalized-query";

/**
 * Callback to fetch data for a ListPages module.
 *
 * Called by resolveModules for each ListPages module in the AST. Receives a
 * normalized query with all `@URL` parameters resolved. Return null/undefined
 * to skip the module.
 */
export type ListPagesDataFetcher = (
  query: NormalizedListPagesQuery,
  requirement: ListPagesDataRequirement,
) => ListPagesExternalData | null | undefined | Promise<ListPagesExternalData | null | undefined>;
