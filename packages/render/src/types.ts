import type { Element, WikitextSettings } from "@wdprlib/ast";
import type { EmbedAllowlistEntry } from "./elements/embed-block";

/**
 * Contextual information about the wiki page being rendered.
 *
 * The renderer uses this to resolve relative links, local file paths,
 * page-existence checks (adding a `"newpage"` CSS class to links
 * targeting non-existent pages), and `[[iftags]]` evaluation.
 *
 * @group Render Options
 */
export interface PageContext {
  /** Full page name including category prefix (e.g. `"secret:test2"`) */
  pageName: string;
  /** Site slug for the current page (e.g. `"scp-wiki"`) */
  site?: string;
  /** Current site domain used for absolute URL generation (e.g. `"scp-wiki.example.org"`) */
  domain?: string;
  /** Known domains for cross-site page references keyed by site slug. */
  siteDomains?: Record<string, string>;
  /** Resolve a cross-site page reference site slug to a domain. */
  resolveSiteDomain?: (site: string) => string | null | undefined;
  /**
   * Returns whether a page exists on the site.
   * When a target page does not exist, the renderer adds `class="newpage"`
   * to the link element — the standard Wikidot convention for red-links.
   */
  pageExists?: (page: string) => boolean;
  /** Page tags used for client-side `[[iftags]]` evaluation during rendering */
  tags?: string[];
  /**
   * Image attachments of the current page, used by the content-less
   * `[[gallery]]` form. Provide attachments whose mimetype is `image/*`
   * when the upstream attachment API includes other file types; order does
   * not matter — each gallery sorts by its own `order` attribute. When
   * omitted, auto galleries render as an empty gallery box; an empty array
   * renders the Wikidot "no images" error.
   */
  files?: PageFileData[];
}

/**
 * A single page attachment, as provided via {@link PageContext.files}.
 *
 * @group Render Options
 */
export interface PageFileData {
  /** Attachment filename (unique within a page) */
  name: string;
  /**
   * Upload time as a comparable number (e.g. UNIX seconds). Enables
   * `order="created_at"` sorting; files without it sort last, keeping
   * their given order.
   */
  createdAt?: number;
}

/**
 * User profile data returned by a user-resolver callback.
 *
 * Passed to the renderer to produce the Wikidot user-info markup
 * (`[[user username]]`). When a field is omitted the corresponding
 * UI element is simply not emitted.
 *
 * @group Render Options
 */
export interface ResolvedUser {
  /** Display name shown in the rendered output (falls back to the raw username) */
  name?: string;
  /** Profile URL. When omitted the username is rendered as a non-navigable `<span>` */
  url?: string;
  /** Avatar image URL. When omitted no avatar `<img>` is rendered */
  avatarUrl?: string;
  /** Karma-badge image URL shown behind the avatar (Wikidot-specific feature) */
  karmaUrl?: string;
}

/**
 * Async/sync resolver callbacks for content that depends on external data.
 *
 * Unlike the parser's `DataProvider` (which fetches bulk data for
 * module expansion), these resolvers are called per-element during the
 * rendering pass.
 *
 * @group Render Options
 */
export interface RenderResolvers {
  /**
   * Look up a user profile by username.
   *
   * @param username - The raw username from `[[user username]]`
   * @returns Profile data for rendering, or `null` if the user is unknown.
   *          When `null` or when the resolver is omitted, the username is
   *          rendered as plain text.
   */
  user?: (username: string) => ResolvedUser | null;

  /**
   * Build an iframe `src` URL for an `[[html]]` block.
   *
   * @param index - Zero-based index matching `SyntaxTree["html-blocks"]`
   * @returns The URL string. When empty or when the resolver is omitted,
   *          the default pattern `/{pageName}/html/{hash}-{nonce}` is used.
   *
   * @security The returned URL is injected directly into the iframe `src`
   * attribute. The caller must validate the scheme to reject `javascript:`,
   * `data:`, and other dangerous protocols.
   */
  htmlBlockUrl?: (index: number, content: string) => string;
}

/**
 * Full configuration for `renderToHtml()`.
 *
 * Every field is optional; defaults produce safe, standalone HTML output
 * suitable for a full wiki page.
 *
 * @group Render Options
 */
export interface RenderOptions {
  /**
   * Base URL for resolving protocol-relative URLs (e.g. `"//example.com/path"`).
   *
   * The scheme of this URL (`http:` or `https:`) is prepended to
   * protocol-relative references. When omitted, HTTPS is assumed.
   *
   * @example "https://scp-wiki.wikidot.com"
   */
  baseUrl?: string;

  /**
   * Context-dependent feature flags.
   * Defaults to page-mode settings when omitted.
   */
  settings?: WikitextSettings;

  /** Page context for resolving relative links, local file paths, etc. */
  page?: PageContext;

  /**
   * Pre-collected footnote element arrays from `SyntaxTree.footnotes`.
   * Passed through so the renderer can emit footnote bodies in the
   * `[[footnoteblock]]` section.
   */
  footnotes?: Element[][];

  /** Callbacks for resolving users, HTML-block URLs, etc. */
  resolvers?: RenderResolvers;
  /**
   * Sandbox attribute value for htmlBlock iframes.
   * - undefined: Empty sandbox attribute (all sandbox restrictions enabled)
   * - null: No sandbox attribute (explicit compatibility opt-out; scripts can run)
   * - string: Use as sandbox attribute value (e.g., "allow-scripts allow-same-origin")
   *
   * Examples:
   * - No sandbox (Wikidot compatible): htmlBlockSandbox: null
   * - Block scripts: htmlBlockSandbox: "allow-same-origin"
   * - Allow scripts: htmlBlockSandbox: "allow-scripts allow-same-origin"
   *
   * @security Combining `allow-scripts` and `allow-same-origin` for same-origin
   * content can let the embedded document remove its own sandbox attribute.
   */
  htmlBlockSandbox?: string | null;
  /**
   * Allowlist for [[embed]] content with host and optional path validation.
   * - undefined: Uses default allowlist (YouTube, Vimeo, etc. with path restrictions)
   * - EmbedAllowlistEntry[]: Custom allowlist with host patterns and optional path prefixes
   * - []: Block all embeds
   * - null: Allow any HTTPS iframe (Wikidot's 'anyiframe' behavior)
   */
  embedAllowlist?: EmbedAllowlistEntry[] | null;
}
