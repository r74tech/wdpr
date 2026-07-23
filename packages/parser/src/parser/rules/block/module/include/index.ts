/**
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
 * - Iterative expansion with configurable iteration limit (Wikidot-compatible)
 *
 * @module
 */

export {
  resolveIncludes,
  resolveIncludesAsync,
  resolveIncludesAsyncWithTrace,
  resolveIncludesWithTrace,
} from "./resolve";
export { extractIncludeReferences } from "./references";
export type {
  IncludeFetcher,
  AsyncIncludeFetcher,
  ResolveIncludesOptions,
  IncludeReference,
  IncludeDependency,
  IncludeIterationTrace,
  ResolveIncludesTraceResult,
} from "./resolve";
