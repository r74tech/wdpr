/**
 *
 * Query normalization for the ListPages module.
 *
 * Converts the raw string-based `ListPagesQuery` (where fields like `tags`,
 * `category`, and `order` are plain strings) into a `NormalizedListPagesQuery`
 * with type-safe structured objects. This makes it straightforward for external
 * applications to build database queries from the normalized representation
 * without having to re-parse Wikidot's query syntax.
 *
 * Based on Wikidot official documentation:
 * https://www.wikidot.com/doc-modules:listpages-module
 *
 * @module
 */

import type {
  ListPagesQuery,
  NormalizedListPagesQuery,
} from "./types";
import { parseCategory, parseTags } from "./normalization/tags-category";
import { parseOrder, parseParent } from "./normalization/order-parent";
import { parseDateSelector, parseNumericSelector } from "./normalization/selectors";

export { parseCategory, parseTags } from "./normalization/tags-category";
export { parseOrder, parseParent } from "./normalization/order-parent";
export { parseDateSelector, parseNumericSelector } from "./normalization/selectors";

/**
 * Normalize a ListPagesQuery into structured types
 *
 * @param query - Raw query with string fields
 * @returns Normalized query with structured types
 */
export function normalizeQuery(query: ListPagesQuery): NormalizedListPagesQuery {
  const result: NormalizedListPagesQuery = {};

  // Pass through simple fields
  if (query.pagetype) result.pagetype = query.pagetype;
  if (query.linkTo) result.linkTo = query.linkTo;
  if (query.createdBy) result.createdBy = query.createdBy;
  if (query.name) result.name = query.name;
  if (query.fullname) result.fullname = query.fullname;
  if (query.range) result.range = query.range;
  if (query.dataFormFields) result.dataFormFields = query.dataFormFields;
  if (query.offset !== undefined) result.offset = query.offset;
  if (query.limit !== undefined) result.limit = query.limit;
  if (query.perPage !== undefined) result.perPage = query.perPage;
  if (query.reverse !== undefined) result.reverse = query.reverse;

  // Parse complex fields
  if (query.tags) result.tags = parseTags(query.tags);
  if (query.category) result.category = parseCategory(query.category);
  if (query.order) result.order = parseOrder(query.order);
  if (query.parent) {
    const parent = parseParent(query.parent);
    if (parent) result.parent = parent;
  }
  if (query.createdAt) {
    const createdAt = parseDateSelector(query.createdAt);
    if (createdAt) result.createdAt = createdAt;
  }
  if (query.updatedAt) {
    const updatedAt = parseDateSelector(query.updatedAt);
    if (updatedAt) result.updatedAt = updatedAt;
  }
  if (query.rating) {
    const rating = parseNumericSelector(query.rating);
    if (rating) result.rating = rating;
  }
  if (query.votes) {
    const votes = parseNumericSelector(query.votes);
    if (votes) result.votes = votes;
  }

  return result;
}
