/**
 * Normalized tags selector.
 */
export interface NormalizedTags {
  /** AND conditions - pages must have all of these tags (+tag). */
  all: string[];
  /** OR conditions - pages must have any of these tags (no prefix). */
  any: string[];
  /** NOT conditions - pages must not have these tags (-tag). */
  none: string[];
  /** Special selector. */
  special: "same-visible" | "same-all" | "none" | null;
}

/**
 * Normalized category selector.
 */
export interface NormalizedCategory {
  /** Categories to include. */
  include: string[];
  /** Categories to exclude (-category). */
  exclude: string[];
  /** Select all categories (*). */
  all: boolean;
  /** Select current category (.). */
  current: boolean;
}

/**
 * Order field options.
 */
export type OrderField =
  | "created_at"
  | "updated_at"
  | "commented_at"
  | "metadata"
  | "title"
  | "fullname"
  | "rating"
  | "votes"
  | "revisions"
  | "comments"
  | "size"
  | "random";

/**
 * Order direction.
 */
export type OrderDirection = "asc" | "desc";

/**
 * Normalized order specification.
 * Providers validate metadata registration, readability and sortability without falling back
 * to another field. Sort before pagination with a stable page ID tie-breaker. For commented_at,
 * put pages without comments last and use the same visible, non-deleted comments as the count.
 */
export type NormalizedOrder =
  | { field: Exclude<OrderField, "metadata">; direction: OrderDirection }
  | { field: "metadata"; key: string; direction: OrderDirection };

/**
 * Normalized parent selector.
 */
export type NormalizedParent =
  | { type: "none" }
  | { type: "same" }
  | { type: "different" }
  | { type: "children" }
  | { type: "page"; name: string };

/**
 * Date comparison operators.
 */
export type DateComparisonOp = "=" | "<" | ">" | "<=" | ">=" | "<>";

/**
 * Normalized date selector.
 */
export type NormalizedDateSelector =
  | { type: "year"; year: number }
  | { type: "month"; year: number; month: number }
  | { type: "comparison"; op: DateComparisonOp; date: string }
  | { type: "relative"; unit: "day" | "week" | "month"; count: number };

/**
 * Numeric comparison operators.
 */
export type NumericComparisonOp = "=" | "<" | ">" | "<=" | ">=";

/**
 * Normalized numeric selector for rating/votes.
 */
export interface NormalizedNumericSelector {
  op: NumericComparisonOp;
  value: number;
}

/**
 * Fully normalized ListPages query.
 *
 * All string fields are parsed into structured selector objects. Use
 * `normalizeQuery()` to convert from `ListPagesQuery`.
 */
export interface NormalizedListPagesQuery {
  pagetype?: "normal" | "hidden" | "*";
  category?: NormalizedCategory;
  tags?: NormalizedTags;
  parent?: NormalizedParent;
  linkTo?: string;
  createdAt?: NormalizedDateSelector;
  updatedAt?: NormalizedDateSelector;
  createdBy?: string;
  rating?: NormalizedNumericSelector;
  /**
   * `rating-axis` selects the custom aggregate for rating/votes filters and order; omission
   * selects main. Verify registration and read access before filtering, counting or sorting.
   * Unknown keys must not fall back to main. Display variables select their own keys.
   */
  ratingAxis?: string;
  votes?: NormalizedNumericSelector;
  name?: string;
  fullname?: string;
  range?: "." | "before" | "after" | "others";
  dataFormFields?: Record<string, string>;
  order?: NormalizedOrder;
  offset?: number;
  limit?: number;
  perPage?: number;
  reverse?: boolean;
}
