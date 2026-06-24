/**
 * ListPages query parameters for page selection.
 *
 * @security All string fields contain untrusted user input from wikitext.
 * When using these values in database queries:
 * - NEVER interpolate directly into SQL/NoSQL query strings.
 * - ALWAYS use parameterized queries or prepared statements.
 * - For ORDER BY clauses, use a whitelist of allowed column names.
 */
export interface ListPagesQuery {
  /** Page type selector */
  pagetype?: "normal" | "hidden" | "*";

  /** Category selector. @untrusted User input - use parameterized queries. */
  category?: string;

  /** Tag selector, e.g. "+fruit -admin". @untrusted User input. */
  tags?: string;

  /** Parent page selector. @untrusted User input. */
  parent?: string;

  /** Link target selector. @untrusted User input. */
  linkTo?: string;

  /** Created date selector. @untrusted User input. */
  createdAt?: string;

  /** Updated date selector. @untrusted User input. */
  updatedAt?: string;

  /** Author selector. @untrusted User input. */
  createdBy?: string;

  /** Rating selector. @untrusted User input. */
  rating?: string;

  /** Votes selector. @untrusted User input. */
  votes?: string;

  /** Page name selector. @untrusted User input. */
  name?: string;

  /** Full page name selector (category:name). @untrusted User input. */
  fullname?: string;

  /** Range selector relative to current page */
  range?: "." | "before" | "after" | "others";

  /** Data form field selectors. @untrusted Both keys and values are user input. */
  dataFormFields?: Record<string, string>;

  /** Ordering specification. @untrusted Use whitelist validation for ORDER BY. */
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
