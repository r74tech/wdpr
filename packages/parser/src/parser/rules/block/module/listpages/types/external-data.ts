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
  totalCount: number;
  site: SiteContext;
}
