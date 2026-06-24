/**
 *
 * URL parameter resolver for the `@URL|default` format in ListPages modules.
 *
 * Wikidot's ListPages module supports a dynamic parameter syntax where attribute
 * values can be set to `@URL` or `@URL|default`. At render time, the actual value
 * is read from the page's URL path parameters. This enables "HPC" (Hyper Page
 * Changer) style multi-page content where a single page definition can display
 * different data based on URL parameters.
 *
 * URL parameters follow the pattern `/key/value/key/value/...` in the URL path.
 * When a `url-attr-prefix` is set (e.g., `"page2"`), parameter names are prefixed
 * (e.g., `page2_offset`, `page2_limit`), allowing multiple independent ListPages
 * modules on the same page.
 *
 * @example
 * Wikidot markup:
 * ```
 * [[module ListPages offset="@URL|0" limit="@URL|10" url-attr-prefix="p2"]]
 * ```
 * URL: `/my-page/p2_offset/20/p2_limit/5`
 * Result: offset=20, limit=5
 *
 * @module
 */

export { parseUrlParams } from "./url-resolution/params";
export { resolveAndNormalizeQuery, resolveQuery } from "./url-resolution/resolve";
export { resolveUrlValue } from "./url-resolution/value";
