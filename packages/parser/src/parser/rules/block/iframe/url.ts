/**
 * Normalises a URL string for security checks by removing whitespace and
 * control characters that could be used to evade scheme detection, then
 * lowercasing the result.
 */
export function normalizeIframeUrl(url: string): string {
  return stripControlAndWhitespace(url).toLowerCase();
}

const WHITESPACE = /\s/;

function stripControlAndWhitespace(value: string): string {
  let result = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (WHITESPACE.test(char) || code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      continue;
    }
    result += char;
  }
  return result;
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
