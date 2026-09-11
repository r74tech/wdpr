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
  size: number;
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
    size: input.size ?? 0,
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
