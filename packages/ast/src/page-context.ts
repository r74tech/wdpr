/** Attachment metadata used by page-contextual gallery rendering. */
export interface WikitextPageFile {
  name: string;
  createdAt?: number;
}

/**
 * Page data shared by high-level parser and renderer APIs.
 *
 * `fullName` is the category-qualified Wikidot page name. `unixName`, when
 * available, is the separately named URL-safe page identifier.
 */
export interface WikitextPageContext {
  fullName: string;
  unixName?: string;
  tags: string[];
  urlPath?: string;
  site?: string;
  domain?: string;
  siteDomains?: Record<string, string>;
  resolveSiteDomain?: (site: string) => string | null | undefined;
  files?: WikitextPageFile[];
}
