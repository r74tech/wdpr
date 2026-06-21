/**
 * Normalises a URL string for security checks by removing whitespace and
 * control characters that could be used to evade scheme detection, then
 * lowercasing the result.
 */
export function normalizeIframeUrl(url: string): string {
  return url.replace(/[\s\u0000-\u001f\u007f-\u009f]/g, "").toLowerCase();
}

/**
 * Tests whether a normalised URL begins with a dangerous scheme that must
 * be rejected.
 */
export function isDangerousIframeUrl(normalizedUrl: string): boolean {
  return /^(javascript|data|vbscript):/i.test(normalizedUrl);
}

export function isAllowedIframeUrl(url: string): boolean {
  const normalizedUrl = normalizeIframeUrl(url);
  if (isDangerousIframeUrl(normalizedUrl)) {
    return false;
  }
  return /^https?:\/\//i.test(normalizedUrl);
}
