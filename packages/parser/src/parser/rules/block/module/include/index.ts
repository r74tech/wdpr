/**
 * @module include
 *
 * Include directive resolution for Wikidot's `[[include page]]` syntax.
 *
 * The include system performs text-level macro expansion before parsing. Each
 * `[[include page | var=value]]` directive is replaced with the fetched page's
 * content (after variable substitution), allowing block structures like `[[div]]`
 * to span across include boundaries.
 *
 * Supports:
 * - Same-site includes: `[[include page-name]]`
 * - Cross-site includes: `[[include :site-name:page-name]]`
 * - Variable substitution: `[[include page | key=value]]` replaces `{$key}` in the included content
 * - Recursive includes with configurable depth limit and circular dependency detection
 */

export { resolveIncludes } from "./resolve";
export type { IncludeFetcher, ResolveIncludesOptions } from "./resolve";
