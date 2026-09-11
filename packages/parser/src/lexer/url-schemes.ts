/**
 *
 * URL schemes recognized for bare-URL auto-linking.
 *
 * Mirrors Text_Wiki's Url rule configuration (http://, https://, ftp://,
 * gopher://, news://, mailto:, mms://). The scheme names are shared between
 * the lexer (compact text-run rewinding) and the autolink inline rule.
 *
 * @module
 */

/** Scheme names (without `:`) that can start an auto-linked bare URL. */
export const URL_SCHEME_NAMES: ReadonlySet<string> = new Set([
  "http",
  "https",
  "ftp",
  "gopher",
  "news",
  "mailto",
  "mms",
]);

/**
 * Matches a compact text run that ends with a URL scheme name.
 *
 * The boundary is `[^A-Za-z0-9]` (not Text_Wiki's `[^A-Za-z]`) so that runs
 * like `123http` stay fused, matching the non-compact lexer which tokenizes
 * `123http` as a single IDENTIFIER (such URLs are not auto-linked either way).
 */
export const TRAILING_URL_SCHEME: RegExp = /(?:^|[^A-Za-z0-9])(https?|ftp|gopher|news|mailto|mms)$/;

/**
 * Matches the exact scheme prefix the autolink rule consumes:
 * `://` for http/https/ftp/gopher/news/mms and `:` for mailto. Must stay in
 * sync with the autolink rule's URL pattern (a looser `scheme:` test would
 * split `**` markers for inputs like `**http:foo**` that never autolink,
 * turning them into literal `**` instead of bold).
 */
const URL_SCHEME_PREFIX = /^(?:(?:https?|ftp|gopher|news|mms):\/\/|mailto:)/;

/**
 * URL body pattern, ported from Text_Wiki's Url rule regex: scheme + zero or
 * more slash-terminated segments + final segment + one terminating character
 * from `[A-Za-z%0-9/?=&~_]`.
 *
 * Scheme matching is case-sensitive (lowercase only) on purpose: Text_Wiki's
 * inline URL regex has no `i` flag and lists lowercase schemes, so Wikidot does
 * not auto-link `HTTP://…`. Shared by the autolink rule and the lexer's bold
 * marker split.
 */
export const URL_PATTERN: RegExp =
  /^(?:(?:https?|ftp|gopher|news|mms):\/\/|mailto:)(?:[^ \\/"']*\/)*[^ \t\n\\/"']*[A-Za-z%0-9/?=&~_]/;

/**
 * Whether `src` begins a URL scheme prefix (e.g. `http://`) at `pos`.
 *
 * A prefix-only check, used for single-bracket links (`[ftp://x Label]`) whose
 * URL portion is already delimited by the label, so the full URL body does not
 * need to be validated here.
 */
export function startsWithUrlScheme(src: string, pos: number): boolean {
  return URL_SCHEME_PREFIX.test(src.slice(pos, pos + 10));
}

/**
 * Whether a complete autolinkable URL (not just a scheme prefix) begins at
 * `pos` in `src`.
 *
 * Used by the lexer to decide whether `**` before a scheme is a bold marker or
 * a literal `*` plus a new-tab URL prefix: only split the marker when a valid
 * URL actually follows, so `**http://**` (no URL body) stays bold while
 * `**http://x**` splits into `*` + autolink + `**`.
 */
export function startsWithUrl(src: string, pos: number): boolean {
  // Scheme + a short body is enough to decide; cap the slice so a very long
  // line does not get copied on every `**`.
  return URL_PATTERN.test(src.slice(pos, pos + 2048));
}
