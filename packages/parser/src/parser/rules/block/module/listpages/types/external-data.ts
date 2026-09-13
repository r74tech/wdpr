import type { RatingAggregate } from "@wdprlib/ast";

/** Values for host-registered metadata keys. Missing entries remain unavailable. */
export type PageMetadataValue =
  | { type: "text"; value: string }
  | { type: "number"; value: number }
  | { type: "date"; value: Date }
  | { type: "user"; value: UserInfo };

/**
 * User information.
 */
export interface UserInfo {
  id: number;
  name: string;
  unixName: string;
}

/**
 * Page data provided by an external source.
 */
export interface PageData {
  /**
   * `%%metadata{key}%%`: only registered, readable entries; keys are case-sensitive.
   * Values are literal text. Date values accept strftime; user format is name, |id or |unix.
   * Tag change date/editor may be host-defined keys; WDPR reserves no such keys.
   */
  metadata?: Readonly<Record<string, PageMetadataValue | null>>;
  /**
   * `%%customrate{key}%%`, `%%customrate_votes{key}%%`, `%%customrate_percent{key}%%`.
   * Supply readable aggregates for requirement.customRateKeys, just as formFields selects
   * form data. Missing keys expand to empty text; a supplied zero remains zero.
   */
  customRates?: Readonly<Record<string, RatingAggregate | null>>;
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

  // Wikitext content split by ==== when resolving %%content{n}%%.
  content?: string;
  /**
   * Text extracted from this page's resolved AST for preview and
   * `%%excerpt{pattern="..." group="1" match="2" max="200"}%%`.
   * Values stay literal; raw content is never a fallback.
   * The host owns extraction policy, dependency invalidation and recursion limits.
   */
  readableText?: string;
  /**
   * First nonempty paragraph from extractFirstParagraph, for summary and first_paragraph.
   * Uses the same extraction policy as readableText. Empty when no readable paragraph
   * exists; undefined when unavailable. Headings and appended footnotes are excluded.
   */
  firstParagraph?: string;

  // Tags
  tags: string[];
  hiddenTags: string[];

  // Form data
  formData?: Record<string, string>;
  formRaw?: Record<string, string>;
  formLabel?: Record<string, string>;
  formHint?: Record<string, string>;

  // Metrics
  children: number;
  comments: number;
  /** Materialized readable character count, computed with countCharacters. */
  size?: number;
  rating: number;
  ratingVotes: number;
  ratingPercent?: number;
  revisions: number;
}

type PageDataInput = Pick<PageData, "fullname" | "title" | "createdAt" | "updatedAt" | "tags"> &
  Partial<Omit<PageData, "fullname" | "title" | "createdAt" | "updatedAt" | "tags">>;

export function definePageData(input: PageDataInput): PageData {
  const separator = input.fullname.indexOf(":");
  const category = separator === -1 ? "_default" : input.fullname.slice(0, separator);
  const name = separator === -1 ? input.fullname : input.fullname.slice(separator + 1);

  return {
    ...input,
    name: input.name ?? name,
    category: input.category ?? category,
    hiddenTags: input.hiddenTags ?? [],
    children: input.children ?? 0,
    comments: input.comments ?? 0,
    rating: input.rating ?? 0,
    ratingVotes: input.ratingVotes ?? 0,
    revisions: input.revisions ?? 0,
  };
}

/**
 * Site context information.
 */
export interface SiteContext {
  title: string;
  name: string;
  domain: string;
}

/**
 * External data for a single ListPages module.
 */
export interface ListPagesExternalData {
  pages: PageData[];
  /** Matching items before offset and limit; use the same visibility filters as pages. */
  totalCount: number;
  site: SiteContext;
  /** Filled by module resolution when a page URL is available. */
  pagination?: {
    currentPage: number;
    perPage: number;
    totalPages: number;
    /** Actual fetch offset, including the module's starting offset. */
    offset: number;
    /** Total item limit after URL resolution, not the fetch batch size. */
    limit?: number;
    urlPath: string;
    parameter: string;
  };
}
