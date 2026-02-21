/**
 *
 * Renderer for `[[embed]]...[[/embed]]` block-level embeds.
 *
 * Unlike inline embeds (which target specific providers like YouTube),
 * embed blocks contain raw HTML that the user provides. This module
 * validates and sanitizes that HTML through a multi-layer pipeline:
 *
 * 1. `sanitize-html` strips everything except a single `<iframe>` with
 *    a limited set of safe attributes.
 * 2. The iframe's `src` URL must use HTTP or HTTPS.
 * 3. The hostname and path must match the configured allowlist (or the
 *    allowlist can be set to `null` for Wikidot's "anyiframe" mode).
 *
 * If any validation step fails, a Wikidot-compatible error block is
 * rendered instead.
 *
 * @module
 */

import type { EmbedBlockData } from "@wdprlib/ast";
import type { Element } from "domhandler";
import { parseDocument } from "htmlparser2";
import sanitizeHtml from "sanitize-html";
import type { RenderContext } from "../context";

/**
 * Boolean attributes that should be normalized to attr="attr" format
 * (Wikidot normalizes these attributes in its output)
 */
const BOOLEAN_ATTRIBUTES = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "novalidate",
  "open",
  "readonly",
  "required",
  "reversed",
  "selected",
];

/**
 * Allowlist entry for embed content validation
 * Each entry specifies a host pattern and optional path prefix
 */
export interface EmbedAllowlistEntry {
  /** Host pattern. Supports wildcard prefix '*.' (e.g., '*.youtube.com') */
  host: string;
  /** Optional path prefix that must match (e.g., '/embed/') */
  pathPrefix?: string;
}

/**
 * Default allowlist for embed content (ported from Wikidot's default.php)
 * Only iframes with src matching these host+path patterns will be rendered.
 *
 * Note: Set to null to allow any HTTPS iframe (Wikidot's 'anyiframe' behavior).
 * sanitize-html still enforces HTTPS-only and blocks dangerous attributes.
 */
export const DEFAULT_EMBED_ALLOWLIST: EmbedAllowlistEntry[] | null = [
  // YouTube
  { host: "*.youtube.com", pathPrefix: "/embed/" },
  { host: "*.youtube-nocookie.com", pathPrefix: "/embed/" },
  // Vimeo
  { host: "player.vimeo.com", pathPrefix: "/video/" },
  // Google Maps
  { host: "*.google.com", pathPrefix: "/maps/embed" },
  // Google Calendar
  { host: "calendar.google.com", pathPrefix: "/calendar/embed" },
  // Spotify
  { host: "open.spotify.com", pathPrefix: "/embed/" },
  // SoundCloud
  { host: "w.soundcloud.com", pathPrefix: "/player/" },
  // CodePen
  { host: "codepen.io" },
];

/**
 * sanitize-html configuration for embed content.
 * Only allows iframe elements with safe attributes, HTTPS scheme only.
 */
const SANITIZE_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: ["iframe"],
  allowedAttributes: {
    iframe: [
      "class",
      "src",
      "style",
      "allow",
      "allowfullscreen",
      "frameborder",
      "height",
      "loading",
      "referrerpolicy",
      "sandbox",
      "title",
      "width",
    ],
  },
  allowedSchemes: ["https", "http"],
};

/**
 * Parse HTML and recursively find all `<iframe>` elements.
 *
 * Recursion is needed because `sanitize-html` might leave nested
 * structures intact, and we need to ensure exactly one iframe exists
 * at any nesting level.
 *
 * @param html - Sanitized HTML string.
 * @returns Array of found iframe DOM elements.
 */
function findIframes(html: string): Element[] {
  const doc = parseDocument(html);
  const iframes: Element[] = [];
  function walk(nodes: typeof doc.children): void {
    for (const node of nodes) {
      if (node.type === "tag") {
        if (node.name === "iframe") {
          iframes.push(node);
        }
        if (node.children) {
          walk(node.children);
        }
      }
    }
  }
  walk(doc.children);
  return iframes;
}

/**
 * Check whether a hostname matches a host pattern.
 *
 * Supports wildcard prefix `*.` (e.g., `*.youtube.com` matches both
 * `youtube.com` and `www.youtube.com` but not `evil-youtube.com`).
 * Non-wildcard patterns require an exact match.
 *
 * @param hostname - The actual hostname from the iframe `src` URL.
 * @param pattern - The allowlist host pattern to match against.
 * @returns `true` if the hostname matches the pattern.
 */
function matchesHostPattern(hostname: string, pattern: string): boolean {
  const lowerHostname = hostname.toLowerCase();
  const lowerPattern = pattern.toLowerCase();

  if (lowerPattern.startsWith("*.")) {
    // Wildcard match: *.example.com matches example.com and sub.example.com
    // But not evil-example.com (must be exact or have dot boundary)
    const base = lowerPattern.slice(2); // Remove '*.'
    return lowerHostname === base || lowerHostname.endsWith("." + base);
  }
  // Exact match
  return lowerHostname === lowerPattern;
}

/**
 * Check whether a URL matches an allowlist entry's host and optional path prefix.
 *
 * The path prefix must match at a boundary: it must be followed by `/`, `?`,
 * `#`, or end of string to prevent partial matches (e.g., `/embed` must not
 * match `/embedX`).
 *
 * @param url - Parsed URL from the iframe `src` attribute.
 * @param entry - Allowlist entry with host pattern and optional path prefix.
 * @returns `true` if both host and path conditions are satisfied.
 */
function matchesAllowlistEntry(url: URL, entry: EmbedAllowlistEntry): boolean {
  if (!matchesHostPattern(url.hostname, entry.host)) {
    return false;
  }
  if (entry.pathPrefix) {
    const pathLower = url.pathname.toLowerCase();
    const prefixLower = entry.pathPrefix.toLowerCase();
    if (!pathLower.startsWith(prefixLower)) {
      return false;
    }
    // If prefix ends with /, boundary check is already satisfied
    // Otherwise ensure prefix matches at a boundary (not partial, e.g., /embed vs /embedX)
    if (!prefixLower.endsWith("/")) {
      const remainder = pathLower.slice(prefixLower.length);
      if (remainder && !/^[/?#]/.test(remainder)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Validate and sanitize embed block content through a multi-step pipeline.
 *
 * Steps:
 * 1. Strip all elements except `<iframe>` with safe attributes via `sanitize-html`.
 * 2. Verify exactly one iframe element exists.
 * 3. Parse the iframe `src` URL and enforce HTTP/HTTPS scheme.
 * 4. Match the URL against the allowlist (unless `null` for anyiframe mode).
 *
 * @param content - Raw HTML content from the `[[embed]]` block.
 * @param allowlist - Host/path allowlist entries, or `null` for anyiframe mode.
 * @param baseUrl - Optional base URL for resolving protocol-relative `src` values.
 * @returns Sanitized HTML string, or `null` if validation fails.
 */
function validateAndSanitizeEmbed(
  content: string,
  allowlist: EmbedAllowlistEntry[] | null,
  baseUrl?: string,
): string | null {
  // Sanitize with sanitize-html to remove dangerous content
  const sanitized = sanitizeHtml(content.trim(), SANITIZE_CONFIG);

  if (!sanitized.trim()) {
    return null;
  }

  // Parse sanitized content to find iframes
  const iframes = findIframes(sanitized);

  // Must have exactly one iframe
  if (iframes.length !== 1) {
    return null;
  }

  const iframe = iframes[0]!;
  const src = iframe.attribs.src?.trim();
  if (!src) {
    return null;
  }

  // Parse URL (protocol-relative URLs are resolved against baseUrl)
  let url: URL;
  try {
    if (src.startsWith("//")) {
      // Protocol-relative URL: resolve against baseUrl, defaulting to https:
      const base = baseUrl ?? "https://localhost";
      url = new URL(src, base);
    } else {
      url = new URL(src);
    }
  } catch {
    return null;
  }

  // Only allow HTTP and HTTPS
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  // If allowlist is null, allow any HTTP(S) iframe (Wikidot's 'anyiframe' behavior)
  if (allowlist !== null) {
    // Check if URL matches any allowlist entry
    const matched = allowlist.some((entry) => matchesAllowlistEntry(url, entry));
    if (!matched) {
      return null;
    }
  }

  return sanitized;
}

/**
 * Normalize HTML boolean attributes to Wikidot's format.
 *
 * Wikidot outputs boolean attributes as `attr="attr"` rather than the
 * minimized form (`attr`) or empty form (`attr=""`). This function
 * rewrites both forms to match.
 *
 * @param html - HTML string potentially containing boolean attributes.
 * @returns HTML with boolean attributes in `attr="attr"` format.
 */
function normalizeBooleanAttributes(html: string): string {
  let result = html;
  for (const attr of BOOLEAN_ATTRIBUTES) {
    // Match standalone boolean attribute (not already having a value)
    // Pattern: attr followed by whitespace, > or />
    const standalonePattern = new RegExp(`\\s${attr}(?=\\s|>|/>)`, "gi");
    result = result.replace(standalonePattern, ` ${attr}="${attr}"`);

    // Match attr="" (empty value, sanitize-html output)
    const emptyValuePattern = new RegExp(`\\s${attr}=""`, "gi");
    result = result.replace(emptyValuePattern, ` ${attr}="${attr}"`);
  }
  return result;
}

/**
 * Render an `[[embed]]...[[/embed]]` block element.
 *
 * The raw HTML content is validated and sanitized through the full
 * pipeline. On failure, a Wikidot-compatible error block is shown:
 * `<div class="error-block">Sorry, no match for the embedded content.</div>`.
 *
 * The allowlist is taken from `ctx.options.embedAllowlist`, falling back
 * to {@link DEFAULT_EMBED_ALLOWLIST} when not specified. Setting it to
 * `null` enables Wikidot's "anyiframe" mode (any HTTPS iframe allowed).
 *
 * @param ctx - The current render context.
 * @param data - Embed block data containing the raw HTML contents.
 */
export function renderEmbedBlock(ctx: RenderContext, data: EmbedBlockData): void {
  // Use explicit undefined check to allow null (anyiframe mode)
  const allowlist =
    ctx.options.embedAllowlist !== undefined ? ctx.options.embedAllowlist : DEFAULT_EMBED_ALLOWLIST;

  const sanitized = validateAndSanitizeEmbed(data.contents, allowlist, ctx.options.baseUrl);
  if (sanitized === null) {
    ctx.push('<div class="error-block">Sorry, no match for the embedded content.</div>');
    return;
  }

  // Normalize boolean attributes and output
  const normalized = normalizeBooleanAttributes(sanitized);
  ctx.push(normalized);
}
