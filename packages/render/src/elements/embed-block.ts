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
 * Default allowlist patterns for embed content (ported from Wikidot's default.php)
 * Only content matching these patterns will be rendered.
 *
 * Security: The 'anyiframe' pattern is kept for Wikidot compatibility, but
 * hasDangerousIframeAttributes() blocks dangerous attributes like srcdoc and
 * non-https src URLs. hasDangerousScripts() blocks all script tags.
 */
export const DEFAULT_EMBED_ALLOWLIST: RegExp[] = [
  // Any iframe with standard attributes (Wikidot's 'anyiframe' pattern)
  // Note: Dangerous attributes are blocked separately by hasDangerousIframeAttributes()
  /^<iframe(\s+[a-z0-9_]+\s*=\s*"[^"]*")+>\s*<\/iframe>$/is,

  // YouTube embed
  /^<iframe[^>]*\s+src="https?:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]+"[^>]*>\s*<\/iframe>$/is,
  /^<iframe[^>]*\s+src="https?:\/\/(www\.)?youtube-nocookie\.com\/embed\/[a-zA-Z0-9_-]+"[^>]*>\s*<\/iframe>$/is,

  // Vimeo embed
  /^<iframe[^>]*\s+src="https?:\/\/player\.vimeo\.com\/video\/[0-9]+"[^>]*>\s*<\/iframe>$/is,

  // Google Maps
  /^<iframe[^>]*\s+src="https?:\/\/www\.google\.com\/maps\/embed[^"]*"[^>]*>\s*<\/iframe>$/is,

  // Google Calendar
  /^<iframe[^>]*\s+src="https?:\/\/calendar\.google\.com\/calendar\/embed[^"]*"[^>]*>\s*<\/iframe>$/is,

  // Spotify
  /^<iframe[^>]*\s+src="https?:\/\/open\.spotify\.com\/embed\/[^"]*"[^>]*>\s*<\/iframe>$/is,

  // SoundCloud
  /^<iframe[^>]*\s+src="https?:\/\/w\.soundcloud\.com\/player\/[^"]*"[^>]*>\s*<\/iframe>$/is,

  // Note: Twitter/X embed pattern removed due to XSS risks with blockquote content injection

  // CodePen
  /^<iframe[^>]*\s+src="https?:\/\/codepen\.io\/[^"]*"[^>]*>\s*<\/iframe>$/is,
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
  ADD_ATTR: [
    "allow",
    "allowfullscreen",
    "frameborder",
    "loading",
    "referrerpolicy",
    "sandbox",
  ],
  // Forbid dangerous attributes
  FORBID_ATTR: ["srcdoc", "onload", "onerror", "onclick"],
};

/**
 * Sanitize embed content using DOMPurify
 * Returns null if content is completely removed or src is missing (dangerous content)
 */
function sanitizeEmbed(content: string): string | null {
  const sanitized = purify.sanitize(content.trim(), {
    ...DOMPURIFY_CONFIG,
    RETURN_TRUSTED_TYPE: false,
  }) as string;
  // If DOMPurify removed everything, the content was dangerous
  if (!sanitized.trim()) {
    return null;
  }
  // If iframe exists but has no valid src (empty or removed), reject it
  if (/<iframe[^>]*>/i.test(sanitized)) {
    const srcMatch = sanitized.match(/\s+src\s*=\s*["']([^"']*)["']/i);
    if (!srcMatch || !srcMatch[1]) {
      return null;
    }
  }
  return sanitized;
}

/**
 * Validate embed content against allowlist (pattern-based pre-check)
 */
function matchesAllowlist(content: string, allowlist: RegExp[]): boolean {
  const trimmed = content.trim();
  for (const pattern of allowlist) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  return false;
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
 * Content is validated in two stages:
 * 1. Pattern-based allowlist check (for Wikidot compatibility)
 * 2. DOMPurify sanitization (for XSS protection)
 *
 * Both stages must pass for content to be rendered.
 */
export function renderEmbedBlock(ctx: RenderContext, data: EmbedBlockData): void {
  const allowlist = ctx.options.embedAllowlist ?? DEFAULT_EMBED_ALLOWLIST;

  // Stage 1: Pattern-based allowlist check
  if (!matchesAllowlist(data.contents, allowlist)) {
    ctx.push('<div class="error-block">Sorry, no match for the embedded content.</div>');
    return;
  }

  // Stage 2: DOMPurify sanitization (defense in depth)
  const sanitized = sanitizeEmbed(data.contents);
  if (sanitized === null) {
    ctx.push('<div class="error-block">Sorry, no match for the embedded content.</div>');
    return;
  }

  // Normalize boolean attributes and output
  const normalized = normalizeBooleanAttributes(sanitized);
  ctx.push(normalized);
}
