import { parseIncludeDirective } from "./directive";
import { scanIncludeDirectives, type IncludeDirectiveMatch } from "./scanner";
import type { IncludeReference, ResolveIncludesOptions } from "./resolve/types";

/**
 * Extract include directives from raw source without fetching or expanding them.
 *
 * This uses the same scanner and directive parser as `resolveIncludes`, so it
 * reports only directives that the include expansion pass would recognize.
 *
 * This is a source-phase API. It intentionally does not evaluate later syntax
 * such as comments, expressions, or iftags. Wikidot expands includes before
 * those phases, so an include inside a later comment block is still reported,
 * while a token that only becomes `[[include ...]]` after comment/expression/
 * iftags processing is not reported.
 *
 * The result is not a complete transitive dependency graph. Nested includes
 * only become visible after fetching and expanding the current layer; use
 * `resolveIncludesWithTrace` when the caller needs observed dependency edges
 * across iterative expansion.
 */
export function extractIncludeReferences(
  source: string,
  options?: ResolveIncludesOptions,
): IncludeReference[] {
  if (options?.settings && !options.settings.enablePageSyntax) {
    return [];
  }

  return scanIncludeDirectives(source).map(createIncludeReference);
}

export function createIncludeReference(match: IncludeDirectiveMatch): IncludeReference {
  const { location, assignments } = parseIncludeDirective(match.inner);
  return {
    location,
    assignments,
    start: match.start,
    end: match.end,
    inner: match.inner,
  };
}
