/**
 * ListPages module types
 */

// =============================================================================
// Query Types
// =============================================================================

/**
 * ListPages query parameters for page selection
 *
 * @security All string fields contain **untrusted user input** from wikitext.
 * When using these values in database queries:
 * - **NEVER** interpolate directly into SQL/NoSQL query strings
 * - **ALWAYS** use parameterized queries or prepared statements
 * - For ORDER BY clauses, use a whitelist of allowed column names
 *
 * @example Safe usage with SQL
 * ```typescript
 * // GOOD: Parameterized query
 * db.query("SELECT * FROM pages WHERE category = ?", [query.category]);
 *
 * // BAD: String interpolation (SQL injection vulnerable!)
 * db.query(`SELECT * FROM pages WHERE category = '${query.category}'`);
 * ```
 */
export interface ListPagesQuery {
  /** Page type selector */
  pagetype?: "normal" | "hidden" | "*";

  /**
   * Category selector
   * @untrusted User input - use parameterized queries
   */
  category?: string;

  /**
   * Tag selector (e.g., "+fruit -admin")
   * @untrusted User input - use parameterized queries
   */
  tags?: string;

  /**
   * Parent page selector
   * @untrusted User input - use parameterized queries
   */
  parent?: string;

  /**
   * Link target selector
   * @untrusted User input - use parameterized queries
   */
  linkTo?: string;

  /**
   * Created date selector
   * @untrusted User input - use parameterized queries
   */
  createdAt?: string;

  /**
   * Updated date selector
   * @untrusted User input - use parameterized queries
   */
  updatedAt?: string;

  /**
   * Author selector
   * @untrusted User input - use parameterized queries
   */
  createdBy?: string;

  /**
   * Rating selector
   * @untrusted User input - use parameterized queries
   */
  rating?: string;

  /**
   * Votes selector
   * @untrusted User input - use parameterized queries
   */
  votes?: string;

  /**
   * Page name selector
   * @untrusted User input - use parameterized queries
   */
  name?: string;

  /**
   * Full page name selector (category:name)
   * @untrusted User input - use parameterized queries
   */
  fullname?: string;

  /** Range selector relative to current page */
  range?: "." | "before" | "after" | "others";

  /**
   * Data form field selectors
   * @untrusted Both keys and values are user input
   */
  dataFormFields?: Record<string, string>;

  /**
   * Ordering specification
   * @untrusted User input - use whitelist validation for ORDER BY
   */
  order?: string;

  /** Pagination offset */
  offset?: number;

  /** Maximum number of results */
  limit?: number;

  /** Results per page */
  perPage?: number;

  /** Reverse order */
  reverse?: boolean;
}

// =============================================================================
// Variable Types
// =============================================================================

/**
 * All supported ListPages template variables
 */
export type ListPagesVariable =
  // Lifecycle - created
  | "created_at"
  | "created_by"
  | "created_by_unix"
  | "created_by_id"
  | "created_by_linked"
  // Lifecycle - updated
  | "updated_at"
  | "updated_by"
  | "updated_by_unix"
  | "updated_by_id"
  | "updated_by_linked"
  // Lifecycle - commented
  | "commented_at"
  | "commented_by"
  | "commented_by_unix"
  | "commented_by_id"
  | "commented_by_linked"
  // Structure - page
  | "name"
  | "category"
  | "fullname"
  | "title"
  | "title_linked"
  | "link"
  // Structure - parent
  | "parent_name"
  | "parent_category"
  | "parent_fullname"
  | "parent_title"
  | "parent_title_linked"
  // Content
  | "content"
  | "content_n" // content{n}
  | "preview"
  | "preview_n" // preview(n)
  | "summary"
  | "first_paragraph"
  // Tags
  | "tags"
  | "tags_linked"
  | "_tags"
  | "_tags_linked"
  // Form data
  | "form_data"
  | "form_raw"
  | "form_label"
  | "form_hint"
  // Metrics
  | "children"
  | "comments"
  | "size"
  | "rating"
  | "rating_votes"
  | "rating_percent"
  | "revisions"
  // Pagination
  | "index"
  | "total"
  | "limit"
  | "total_or_limit"
  // Site context
  | "site_title"
  | "site_name"
  | "site_domain";

// =============================================================================
// Data Requirement Types
// =============================================================================

/**
 * Data requirement for a single ListPages module
 */
export interface ListPagesDataRequirement {
  /** Unique identifier for this module instance */
  id: number;

  /** Query parameters */
  query: ListPagesQuery;

  /** Variables used in the template */
  neededVariables: ListPagesVariable[];

  /** Indices needed for content{n} */
  contentSectionIndices?: number[];

  /** Lengths needed for preview(n) */
  previewLengths?: number[];

  /** Field names needed for form_data{field} etc */
  formFields?: string[];

  /** Prefix for tags_linked|prefix */
  tagsLinkPrefix?: string;

  /** Prefix for _tags_linked|prefix */
  hiddenTagsLinkPrefix?: string;

  /**
   * URL attribute prefix for multiple ListPages modules
   * When set, URL parameters are prefixed (e.g., "page2" -> "/page2_limit/1")
   */
  urlAttrPrefix?: string;

  /**
   * Raw attribute values before URL resolution
   * Contains original string values that may include "@URL" or "@URL|default" format
   * External applications should use these to resolve URL parameters
   */
  rawAttributes: Record<string, string>;
}

/**
 * All data requirements from parsing
 */
export interface DataRequirements {
  listPages: ListPagesDataRequirement[];
  listUsers: import("../listusers/types").ListUsersDataRequirement[];
}

// =============================================================================
// External Data Types
// =============================================================================

/**
 * User information
 */
export interface UserInfo {
  id: number;
  name: string;
  unixName: string;
}

/**
 * Page data provided by external source
 */
export interface PageData {
  // Identity
  name: string;
  category: string;
  fullname: string;
  title: string;

  // Lifecycle - created
  createdAt: Date;
  createdBy?: UserInfo;

  // Lifecycle - updated
  updatedAt: Date;
  updatedBy?: UserInfo;

  // Lifecycle - commented
  commentedAt?: Date;
  commentedBy?: UserInfo;

  // Parent
  parentName?: string;
  parentCategory?: string;
  parentFullname?: string;
  parentTitle?: string;

  // Content (====で区切られた形式。wdparserが%%content{n}%%解決時に分割する)
  content?: string;

  // Tags
  tags: string[];
  hiddenTags: string[]; // Starting with _

  // Form data
  formData?: Record<string, string>;
  formRaw?: Record<string, string>;
  formLabel?: Record<string, string>;
  formHint?: Record<string, string>;

  // Metrics
  children: number;
  comments: number;
  size: number;
  rating: number;
  ratingVotes: number;
  ratingPercent?: number;
  revisions: number;
}

/**
 * Site context information
 */
export interface SiteContext {
  title: string;
  name: string;
  domain: string;
}

/**
 * External data for a single ListPages module
 */
export interface ListPagesExternalData {
  pages: PageData[];
  totalCount: number;
  site: SiteContext;
}

/**
 * Callback to fetch data for a ListPages module
 *
 * Called by resolveModules for each ListPages module in the AST.
 * Receives a normalized query with all @URL parameters resolved.
 * Return null/undefined to skip the module (outputs nothing).
 *
 * @param query - Normalized query with structured types (tags, category, order, etc.)
 * @param requirement - Original data requirement (for accessing id, neededVariables, etc.)
 */
export type ListPagesDataFetcher = (
  query: NormalizedListPagesQuery,
  requirement: ListPagesDataRequirement,
) => ListPagesExternalData | null | undefined | Promise<ListPagesExternalData | null | undefined>;

// Note: DataProvider is in ../types-common.ts to avoid circular dependency

// =============================================================================
// Compiled Template Types
// =============================================================================

/**
 * Context passed to compiled template
 */
export interface VariableContext {
  page: PageData;
  index: number;
  total: number;
  limit?: number;
  site: SiteContext;
}

/**
 * Compiled template function
 */
export type CompiledTemplate = (ctx: VariableContext) => string;

// =============================================================================
// Normalized Query Types
// =============================================================================

/**
 * Normalized tags selector
 */
export interface NormalizedTags {
  /** AND conditions - pages must have ALL of these tags (+tag) */
  all: string[];
  /** OR conditions - pages must have ANY of these tags (no prefix) */
  any: string[];
  /** NOT conditions - pages must NOT have these tags (-tag) */
  none: string[];
  /** Special selector */
  special: "same-visible" | "same-all" | "none" | null;
}

/**
 * Normalized category selector
 */
export interface NormalizedCategory {
  /** Categories to include */
  include: string[];
  /** Categories to exclude (-category) */
  exclude: string[];
  /** Select all categories (*) */
  all: boolean;
  /** Select current category (.) */
  current: boolean;
}

/**
 * Order field options
 */
export type OrderField =
  | "created_at"
  | "updated_at"
  | "title"
  | "fullname"
  | "rating"
  | "votes"
  | "revisions"
  | "comments"
  | "size"
  | "random";

/**
 * Order direction
 */
export type OrderDirection = "asc" | "desc";

/**
 * Normalized order specification
 */
export interface NormalizedOrder {
  field: OrderField;
  direction: OrderDirection;
}

/**
 * Normalized parent selector
 */
export type NormalizedParent =
  | { type: "none" } // "-": orphan pages
  | { type: "same" } // "=": sibling pages
  | { type: "different" } // "-=": different parent
  | { type: "children" } // ".": children of current page
  | { type: "page"; name: string }; // specific page name

/**
 * Date comparison operators
 */
export type DateComparisonOp = "=" | "<" | ">" | "<=" | ">=" | "<>";

/**
 * Normalized date selector
 */
export type NormalizedDateSelector =
  | { type: "year"; year: number }
  | { type: "month"; year: number; month: number }
  | { type: "comparison"; op: DateComparisonOp; date: string }
  | { type: "relative"; unit: "day" | "week" | "month"; count: number };

/**
 * Numeric comparison operators
 */
export type NumericComparisonOp = "=" | "<" | ">" | "<=" | ">=";

/**
 * Normalized numeric selector (for rating/votes)
 */
export interface NormalizedNumericSelector {
  op: NumericComparisonOp;
  value: number;
}

/**
 * Fully normalized ListPages query
 *
 * All string fields are parsed and structured into type-safe objects.
 * Use `normalizeQuery()` to convert from `ListPagesQuery`.
 *
 * Note: This is structural normalization, not full validation.
 * Invalid inputs are either rejected (return undefined) or ignored.
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
