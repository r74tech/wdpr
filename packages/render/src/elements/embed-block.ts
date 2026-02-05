import type { EmbedBlockData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import DOMPurify, { type Config } from "dompurify";
import { JSDOM } from "jsdom";

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
 * DOMPurify still enforces HTTPS-only and blocks dangerous attributes.
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

// Initialize DOMPurify with jsdom
const window = new JSDOM("").window;
const purify = DOMPurify(window);

// Add hook to validate src attribute (only allow https://)
purify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName === "src" && data.attrValue) {
    // Case-insensitive check for https:// scheme
    if (!data.attrValue.toLowerCase().startsWith("https://")) {
      data.attrValue = "";
      data.forceKeepAttr = false;
    }
  }
});

/**
 * DOMPurify configuration for embed content
 * Only allows iframe elements with safe attributes
 */
const DOMPURIFY_CONFIG: Config = {
  ALLOWED_TAGS: ["iframe"],
  // Add iframe-specific attributes to the default allowlist
  ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "loading", "referrerpolicy", "sandbox"],
  // Forbid dangerous attributes
  FORBID_ATTR: ["srcdoc", "onload", "onerror", "onclick"],
};

/**
 * Check if a hostname matches an allowlist entry
 * Supports wildcard prefix with '*.' (e.g., '*.youtube.com' matches 'www.youtube.com')
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
 * Check if URL matches an allowlist entry (host and optional path prefix)
 * Path prefix must match at a boundary (followed by /, ?, #, or end of path)
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
 * Validate and sanitize embed content
 * Returns sanitized HTML string or null if content is invalid/dangerous
 *
 * Validation rules:
 * - Content must contain exactly one iframe element
 * - iframe must have a valid HTTPS src URL
 * - src URL must match the allowlist (host + path prefix)
 * - DOMPurify removes dangerous attributes
 */
function validateAndSanitizeEmbed(
  content: string,
  allowlist: EmbedAllowlistEntry[] | null,
): string | null {
  // First, sanitize with DOMPurify to remove dangerous content
  const sanitized = purify.sanitize(content.trim(), {
    ...DOMPURIFY_CONFIG,
    RETURN_TRUSTED_TYPE: false,
  }) as string;

  if (!sanitized.trim()) {
    return null;
  }

  // Parse sanitized content once (avoid multiple JSDOM instances)
  const dom = new JSDOM(sanitized);
  const iframes = dom.window.document.querySelectorAll("iframe");

  // Must have exactly one iframe
  if (iframes.length !== 1) {
    return null;
  }

  const iframe = iframes[0]!;
  const src = iframe.getAttribute("src")?.trim();
  if (!src) {
    return null;
  }

  // Parse URL
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }

  // Only allow HTTPS
  if (url.protocol !== "https:") {
    return null;
  }

  // If allowlist is null, allow any HTTPS iframe (Wikidot's 'anyiframe' behavior)
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
 * Normalize boolean attributes to Wikidot format (attr -> attr="attr" or attr="" -> attr="attr")
 */
function normalizeBooleanAttributes(html: string): string {
  let result = html;
  for (const attr of BOOLEAN_ATTRIBUTES) {
    // Match standalone boolean attribute (not already having a value)
    // Pattern: attr followed by whitespace, > or />
    const standalonePattern = new RegExp(`\\s${attr}(?=\\s|>|/>)`, "gi");
    result = result.replace(standalonePattern, ` ${attr}="${attr}"`);

    // Match attr="" (empty value, DOMPurify output)
    const emptyValuePattern = new RegExp(`\\s${attr}=""`, "gi");
    result = result.replace(emptyValuePattern, ` ${attr}="${attr}"`);
  }
  return result;
}

/**
 * Render embed-block element (Wikidot style [[embed]]..[[/embed]])
 *
 * Content is validated in a single pass:
 * 1. DOMPurify sanitization (removes dangerous attributes)
 * 2. Single iframe requirement check
 * 3. HTTPS-only and allowlist (host + path) validation
 */
export function renderEmbedBlock(ctx: RenderContext, data: EmbedBlockData): void {
  // Use explicit undefined check to allow null (anyiframe mode)
  const allowlist =
    ctx.options.embedAllowlist !== undefined ? ctx.options.embedAllowlist : DEFAULT_EMBED_ALLOWLIST;

  const sanitized = validateAndSanitizeEmbed(data.contents, allowlist);
  if (sanitized === null) {
    ctx.push('<div class="error-block">Sorry, no match for the embedded content.</div>');
    return;
  }

  // Normalize boolean attributes and output
  const normalized = normalizeBooleanAttributes(sanitized);
  ctx.push(normalized);
}
