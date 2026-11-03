import sanitizeHtml from "sanitize-html";
import type { EmbedAllowlistEntry } from "./allowlist";
import { matchesAllowlistEntry } from "./allowlist";
import { findIframes, parseIframeUrl } from "./iframe";
import { createSanitizeConfig } from "./sanitize-config";

/**
 * Validate and sanitize embed block content through a multi-step iframe pipeline.
 *
 * The returned string is sanitize-html output and must be emitted as-is.
 */
export function validateAndSanitizeEmbed(
  content: string,
  allowlist: EmbedAllowlistEntry[] | null,
  baseUrl?: string,
): string | null {
  const sanitized = sanitizeHtml(content.trim(), createSanitizeConfig(baseUrl));
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
  if (url.protocol !== "https:") {
    return null;
  }
  if (allowlist !== null && !allowlist.some((entry) => matchesAllowlistEntry(url, entry))) {
    return null;
  }

  return sanitized;
}
