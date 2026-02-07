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
  NormalizedTags,
  NormalizedCategory,
  NormalizedOrder,
  NormalizedParent,
  NormalizedDateSelector,
  NormalizedNumericSelector,
  OrderField,
  OrderDirection,
  DateComparisonOp,
  NumericComparisonOp,
} from "./types";

/**
 * Pattern for splitting multi-value attribute strings.
 * Wikidot allows commas, semicolons, and whitespace as separators between values.
 */
const TOKEN_SEPARATOR = /[,;\s]+/;

/**
 * Parse tags string into structured format
 *
 * Syntax:
 * - `+tag`: AND condition (must have this tag)
 * - `-tag`: NOT condition (must not have this tag)
 * - `tag`: OR condition (any of these tags)
 * - `=`: same visible tags as current page
 * - `==`: exact same tags as current page
 * - `-`: pages with no tags
 */
export function parseTags(value: string): NormalizedTags {
  const result: NormalizedTags = {
    all: [],
    any: [],
    none: [],
    special: null,
  };

  const trimmed = value.trim();
  if (!trimmed) return result;

  // Check for special selectors
  if (trimmed === "-") {
    result.special = "none";
    return result;
  }
  if (trimmed === "==") {
    result.special = "same-all";
    return result;
  }

  const tokens = trimmed.split(TOKEN_SEPARATOR).filter(Boolean);

  for (const token of tokens) {
    if (token === "=") {
      result.special = "same-visible";
    } else if (token.startsWith("+")) {
      const tag = token.slice(1);
      if (tag) result.all.push(tag);
    } else if (token.startsWith("-")) {
      const tag = token.slice(1);
      if (tag) result.none.push(tag);
    } else {
      result.any.push(token);
    }
  }

  return result;
}

/**
 * Parse category string into structured format
 *
 * Syntax:
 * - `*`: all categories
 * - `.`: current category
 * - `-category`: exclude category
 * - `category`: include category
 * - Multiple categories separated by comma, semicolon, or whitespace
 */
export function parseCategory(value: string): NormalizedCategory {
  const result: NormalizedCategory = {
    include: [],
    exclude: [],
    all: false,
    current: false,
  };

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return result;

  if (trimmed === "*") {
    result.all = true;
    return result;
  }

  const tokens = trimmed.split(TOKEN_SEPARATOR).filter(Boolean);

  for (const token of tokens) {
    if (token === "*") {
      result.all = true;
    } else if (token === ".") {
      result.current = true;
    } else if (token.startsWith("-")) {
      const cat = token.slice(1);
      if (cat) result.exclude.push(cat);
    } else {
      result.include.push(token);
    }
  }

  return result;
}

/**
 * Mapping from Wikidot's order field names (both camelCase PHP-style and
 * snake_case documentation-style) to normalized `OrderField` values.
 */
const ORDER_FIELD_MAP: Record<string, OrderField> = {
  // camelCase format (Wikidot PHP style)
  datecreated: "created_at",
  dateedited: "updated_at",
  title: "title",
  fullname: "fullname",
  rating: "rating",
  votes: "votes",
  revisions: "revisions",
  comments: "comments",
  pagelength: "size",
  size: "size",
  random: "random",
  // snake_case format (documentation style)
  created_at: "created_at",
  updated_at: "updated_at",
};

/**
 * Parse order string into structured format
 *
 * Supports both formats:
 * - camelCase: `dateCreatedDesc`, `titleAsc`, `ratingDesc`
 * - Space-separated: `created_at desc`, `title asc`
 *
 * Default: { field: "created_at", direction: "desc" }
 */
export function parseOrder(value: string): NormalizedOrder {
  const defaultOrder: NormalizedOrder = { field: "created_at", direction: "desc" };
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return defaultOrder;

  // Try space-separated format: "created_at desc"
  const spaceParts = trimmed.split(/\s+/);
  if (spaceParts.length >= 2 && spaceParts[0] && spaceParts[1]) {
    const field = ORDER_FIELD_MAP[spaceParts[0]];
    const direction = spaceParts[1] === "asc" ? "asc" : "desc";
    if (field) {
      return { field, direction };
    }
  }

  // Try camelCase format: "dateCreatedDesc"
  let direction: OrderDirection = "desc";
  let fieldPart = trimmed;

  if (trimmed.endsWith("desc")) {
    direction = "desc";
    fieldPart = trimmed.slice(0, -4);
  } else if (trimmed.endsWith("asc")) {
    direction = "asc";
    fieldPart = trimmed.slice(0, -3);
  }

  const field = ORDER_FIELD_MAP[fieldPart];
  if (field) {
    return { field, direction };
  }

  // Try single word (field only, use default direction)
  const singleField = ORDER_FIELD_MAP[trimmed];
  if (singleField) {
    return { field: singleField, direction: "desc" };
  }

  return defaultOrder;
}

/**
 * Parse parent string into structured format
 *
 * Syntax:
 * - `-`: orphan pages (no parent)
 * - `=`: sibling pages (same parent as current)
 * - `-=`: pages with different parent
 * - `.`: children of current page
 * - `page-name`: children of specific page
 *
 * Returns undefined for empty/whitespace-only input.
 */
export function parseParent(value: string): NormalizedParent | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  switch (trimmed) {
    case "-":
      return { type: "none" };
    case "=":
      return { type: "same" };
    case "-=":
      return { type: "different" };
    case ".":
      return { type: "children" };
    default:
      return { type: "page", name: trimmed };
  }
}

/**
 * Date comparison operators, ordered longest-first so longer operators
 * (like `<=`) are matched before shorter ones (like `<`).
 */
const DATE_COMPARISON_OPS: DateComparisonOp[] = ["<=", ">=", "<>", "<", ">", "="];

/**
 * Pattern for relative date expressions like "last 7 days", "last 2 weeks", "last month".
 * The count is optional and defaults to 1 (e.g., "last month" = "last 1 month").
 */
const RELATIVE_DATE_PATTERN = /^last\s+(?:(\d+)\s+)?(day|week|month)s?$/i;

/**
 * Parse date selector string into structured format
 *
 * Syntax:
 * - `yyyy`: year only
 * - `yyyy.mm`: year and month
 * - `>=yyyy.mm.dd`: comparison with date
 * - `last 7 days`: relative date
 */
export function parseDateSelector(value: string): NormalizedDateSelector | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // Check relative date format: "last 7 days"
  const relativeMatch = trimmed.match(RELATIVE_DATE_PATTERN);
  if (relativeMatch && relativeMatch[2]) {
    const count = relativeMatch[1] ? parseInt(relativeMatch[1], 10) : 1;
    // Validate count is at least 1
    if (count < 1) return undefined;
    const unit = relativeMatch[2].toLowerCase() as "day" | "week" | "month";
    return { type: "relative", unit, count };
  }

  // Check comparison operators
  for (const op of DATE_COMPARISON_OPS) {
    if (trimmed.startsWith(op)) {
      const date = trimmed.slice(op.length).trim();
      if (date) {
        return { type: "comparison", op, date };
      }
    }
  }

  // Check year format: "2024"
  if (/^\d{4}$/.test(trimmed)) {
    return { type: "year", year: parseInt(trimmed, 10) };
  }

  // Check year.month format: "2024.03"
  const monthMatch = trimmed.match(/^(\d{4})\.(\d{1,2})$/);
  if (monthMatch && monthMatch[1] && monthMatch[2]) {
    const month = parseInt(monthMatch[2], 10);
    // Validate month is 1-12
    if (month < 1 || month > 12) return undefined;
    return {
      type: "month",
      year: parseInt(monthMatch[1], 10),
      month,
    };
  }

  return undefined;
}

/**
 * Numeric comparison operators, ordered longest-first for correct prefix matching.
 */
const NUMERIC_COMPARISON_OPS: NumericComparisonOp[] = ["<=", ">=", "<", ">", "="];

/**
 * Parse numeric selector string into structured format
 *
 * Syntax:
 * - `5`: equals 5
 * - `>=10`: greater than or equal to 10
 * - `<0`: less than 0
 *
 * Returns undefined for non-numeric or infinite values.
 */
export function parseNumericSelector(value: string): NormalizedNumericSelector | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // Check comparison operators
  for (const op of NUMERIC_COMPARISON_OPS) {
    if (trimmed.startsWith(op)) {
      const numStr = trimmed.slice(op.length).trim();
      const num = parseFloat(numStr);
      // Strict validation: must be finite number and entire string must be numeric
      if (Number.isFinite(num) && /^-?\d+(\.\d+)?$/.test(numStr)) {
        return { op, value: num };
      }
      return undefined;
    }
  }

  // Plain number (equals) - strict validation
  const num = parseFloat(trimmed);
  if (Number.isFinite(num) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { op: "=", value: num };
  }

  return undefined;
}

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
