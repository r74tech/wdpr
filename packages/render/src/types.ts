import type { Element, WikitextSettings } from "@wdprlib/ast";
import type { EmbedAllowlistEntry } from "./elements/embed-block";

/**
 * Page context for resolving links, images, etc.
 */
export interface PageContext {
  /** Current page's full name (e.g., "secret:test2") */
  pageName: string;
  /** Site slug (e.g., "scp-wiki") */
  site?: string;
  /** Site domain (e.g., "scp-wiki.wikidot.com") */
  domain?: string;
  /** Check if a page exists (for "newpage" class on links) */
  pageExists?: (page: string) => boolean;
  /** Page tags for [[iftags]] conditional rendering */
  tags?: string[];
}

/**
 * Resolved user information for rendering
 */
export interface ResolvedUser {
  /** User's display name (defaults to username if not provided) */
  name?: string;
  /** User profile URL. If not provided, link becomes non-navigable */
  url?: string;
  /** Avatar image URL. If not provided, no avatar is rendered */
  avatarUrl?: string;
  /** Karma image URL for avatar background (Wikidot-specific feature) */
  karmaUrl?: string;
}

/**
 * Resolver functions for dynamic content
 */
export interface RenderResolvers {
  /**
   * Resolve user information from username.
   * Returns user data for rendering, or null if user not found.
   * If not provided, user elements are rendered as plain text.
   */
  user?: (username: string) => ResolvedUser | null;
  /**
   * Returns URL for htmlBlock iframe src.
   * Called with the index of the htmlBlock (0-based, matching tree["html-blocks"] order).
   * If not provided or returns empty string, uses default pattern: /{pageName}/html/{hash}-{nonce}
   *
   * SECURITY NOTE: The returned URL is used directly in iframe src attribute.
   * The application is responsible for validating the URL scheme (e.g., rejecting javascript:, data:).
   */
  htmlBlockUrl?: (index: number) => string;
}

/**
 * Options for HTML rendering
 */
export interface RenderOptions {
  /** Wikitext settings controlling rendering behavior */
  settings?: WikitextSettings;
  /** Page context for resolving file paths, links, etc. */
  page?: PageContext;
  /** Pre-collected footnote elements from SyntaxTree.footnotes */
  footnotes?: Element[][];
  /** Resolver functions for dynamic content */
  resolvers?: RenderResolvers;
  /**
   * Sandbox attribute value for htmlBlock iframes.
   * - undefined/null: No sandbox attribute (Wikidot compatible, scripts can run)
   * - string: Use as sandbox attribute value (e.g., "allow-scripts allow-same-origin")
   *
   * Examples:
   * - No sandbox (Wikidot compatible): htmlBlockSandbox: null
   * - Block scripts: htmlBlockSandbox: "allow-same-origin"
   * - Allow scripts: htmlBlockSandbox: "allow-scripts allow-same-origin"
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
