import { startsWithUrlScheme } from "../../../../lexer/url-schemes";

/**
 * Whether `url` is a valid target for a single-bracket link (`[url label]`).
 *
 * Matches Text_Wiki's described-URL rule (regexLiberal): a site-relative path
 * (`/…`) or any recognized URL scheme (http/https/ftp/gopher/news/mms/mailto).
 * Kept in sync with the autolink rule so bracket-described links and bare
 * auto-links accept the same schemes.
 */
export function isDirectBracketUrl(url: string): boolean {
  return url !== "" && (url.startsWith("/") || startsWithUrlScheme(url, 0));
}
