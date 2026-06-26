export interface CssUrlToken {
  inner: string;
  malformed: boolean;
}

/**
 * Allowlist check for a raw URL string extracted from a normalized `url(...)` token.
 */
export function isCssUrlAllowed(rawUrl: string): boolean {
  let url = rawUrl;

  if (url.length >= 2) {
    const first = url[0];
    const last = url[url.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      url = url.slice(1, -1);
    }
  }

  if (url === "") return true;
  if (url.startsWith("#")) return true;
  if (url.startsWith("./") || url.startsWith("../")) return true;
  if (url.startsWith("//")) return true;
  if (url.startsWith("/")) return true;
  if (url.startsWith("http://") || url.startsWith("https://")) return true;

  if (url.startsWith("data:image/")) {
    const after = url.slice("data:image/".length);
    const sep = Math.min(
      after.indexOf(";") === -1 ? after.length : after.indexOf(";"),
      after.indexOf(",") === -1 ? after.length : after.indexOf(","),
    );
    const mime = after.slice(0, sep);
    if (mime === "png" || mime === "jpeg" || mime === "jpg" || mime === "gif" || mime === "webp") {
      return true;
    }
  }

  return false;
}

/**
 * Extract every `url(...)` invocation from a normalized CSS value.
 */
export function* iterateCssUrls(normalized: string): Generator<CssUrlToken> {
  let searchPos = 0;
  while (searchPos < normalized.length) {
    const idx = normalized.indexOf("url(", searchPos);
    if (idx === -1) return;

    let depth = 1;
    let quoteChar: string | null = null;
    let i = idx + 4;
    while (i < normalized.length && depth > 0) {
      const ch = normalized[i];
      if (quoteChar !== null) {
        if (ch === quoteChar) quoteChar = null;
      } else if (ch === '"' || ch === "'") {
        quoteChar = ch;
      } else if (ch === "(") {
        depth++;
      } else if (ch === ")") {
        depth--;
      }
      i++;
    }

    if (depth > 0) {
      yield { inner: normalized.slice(idx + 4), malformed: true };
      return;
    }

    yield { inner: normalized.slice(idx + 4, i - 1), malformed: false };
    searchPos = i;
  }
}
