import sanitizeHtml from "sanitize-html";
import type { EmbedAllowlistEntry } from "./allowlist";
import { matchesAllowlistEntry } from "./allowlist";
import { findIframes, parseIframeUrl } from "./iframe";
import { SANITIZE_CONFIG } from "./sanitize-config";

export { normalizeBooleanAttributes } from "./boolean-attributes";

/**
 * Validate and sanitize embed block content through a multi-step iframe pipeline.
 */
export function validateAndSanitizeEmbed(
  content: string,
  allowlist: EmbedAllowlistEntry[] | null,
  baseUrl?: string,
): string | null {
  const sanitized = sanitizeHtml(content.trim(), SANITIZE_CONFIG);
  if (!sanitized.trim()) {
    return null;
  }

  const iframes = findIframes(sanitized);
  if (iframes.length !== 1) {
    return null;
  }

  const src = iframes[0]!.attribs.src?.trim();
  if (!src) {
    return null;
  }

  const url = parseIframeUrl(src, baseUrl);
  if (url === null) {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }
  if (allowlist !== null && !allowlist.some((entry) => matchesAllowlistEntry(url, entry))) {
    return null;
  }

  return sanitized;
}
