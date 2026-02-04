import type { EmbedBlockData } from "@wdprlib/ast";
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

/**
 * Check if JS event handlers are present in the content (XSS prevention)
 */
function hasJsEventHandlers(content: string): boolean {
  // Match on* event handlers (onclick, onerror, onload, etc.)
  return /<[^>]*\s+on[a-z]+\s*=/i.test(content);
}

/**
 * Check if content has any script tags (XSS prevention)
 * All script tags are blocked - no external widget scripts are allowed
 */
function hasDangerousScripts(content: string): boolean {
  // Block all script tags - \s* handles potential whitespace between < and script
  return /<\s*script\b/i.test(content);
}

/**
 * Check if iframe has dangerous attributes that could lead to XSS
 */
function hasDangerousIframeAttributes(content: string): boolean {
  // Check for srcdoc attribute (can contain arbitrary HTML/scripts)
  if (/\s+srcdoc\s*=/i.test(content)) {
    return true;
  }

  // Check ALL src attributes for dangerous schemes (not just the first one)
  // This prevents bypass via duplicate src attributes
  const srcMatches = content.matchAll(/\s+src\s*=\s*["']([^"']*)/gi);
  for (const match of srcMatches) {
    const srcValue = match[1]?.toLowerCase().trim();
    // Only allow https:// scheme (http:// blocked to prevent mixed content / MITM)
    if (srcValue && !srcValue.startsWith("https://")) {
      return true;
    }
  }

  return false;
}

/**
 * Validate embed content against allowlist
 */
function isAllowedEmbed(content: string, allowlist: RegExp[]): boolean {
  const trimmed = content.trim();

  // Check for JS event handlers
  if (hasJsEventHandlers(trimmed)) {
    return false;
  }

  // Check for dangerous inline scripts or non-whitelisted script sources
  if (hasDangerousScripts(trimmed)) {
    return false;
  }

  // Check for dangerous iframe attributes (srcdoc, javascript: src, etc.)
  if (/<iframe/i.test(trimmed) && hasDangerousIframeAttributes(trimmed)) {
    return false;
  }

  // Check against allowlist patterns
  for (const pattern of allowlist) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/**
 * Normalize boolean attributes to Wikidot format (attr -> attr="attr")
 */
function normalizeBooleanAttributes(html: string): string {
  let result = html;
  for (const attr of BOOLEAN_ATTRIBUTES) {
    // Match standalone boolean attribute (not already having a value)
    // Pattern: attr followed by whitespace, > or />
    const pattern = new RegExp(`\\s${attr}(?=\\s|>|/>)`, "gi");
    result = result.replace(pattern, ` ${attr}="${attr}"`);
  }
  return result;
}

/**
 * Render embed-block element (Wikidot style [[embed]]..[[/embed]])
 *
 * Content is validated against an allowlist to prevent XSS.
 * Only matching content is rendered; otherwise an error message is shown.
 */
export function renderEmbedBlock(ctx: RenderContext, data: EmbedBlockData): void {
  const allowlist = ctx.options.embedAllowlist ?? DEFAULT_EMBED_ALLOWLIST;

  if (!isAllowedEmbed(data.contents, allowlist)) {
    ctx.push('<div class="error-block">Sorry, no match for the embedded content.</div>');
    return;
  }

  // Normalize boolean attributes and output
  const normalized = normalizeBooleanAttributes(data.contents);
  ctx.push(normalized);
}
