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
 */
export const DEFAULT_EMBED_ALLOWLIST: RegExp[] = [
  // Any iframe with standard attributes (Wikidot's 'anyiframe' pattern)
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

  // Twitter/X embed
  /^<blockquote[^>]*class="twitter-tweet"[^>]*>[\s\S]*<\/blockquote>\s*<script[^>]*src="https?:\/\/platform\.twitter\.com\/widgets\.js"[^>]*>\s*<\/script>$/is,

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
 * Validate embed content against allowlist
 */
function isAllowedEmbed(content: string, allowlist: RegExp[]): boolean {
  const trimmed = content.trim();

  // Check for JS event handlers
  if (hasJsEventHandlers(trimmed)) {
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
