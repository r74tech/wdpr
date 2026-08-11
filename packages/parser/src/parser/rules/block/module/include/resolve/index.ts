/**
 *
 * Text-level expansion of `[[include]]` directives.
 *
 * @module
 */

import type { PageRef } from "@wdprlib/ast";
import { createCachedAsyncIncludeFetcher, createCachedIncludeFetcher } from "./cache";
import {
  expandIterative,
  expandIterativeAsyncWithTrace,
  expandIterativeWithTrace,
} from "./iterate";
import type {
  AsyncIncludeFetcher,
  IncludeFetcher,
  IncludeReference,
  ResolveIncludesOptions,
  ResolveIncludesTraceResult,
} from "./types";

export type {
  IncludeFetcher,
  AsyncIncludeFetcher,
  ResolveIncludesOptions,
  IncludeReference,
  IncludeDependency,
  IncludeIterationTrace,
  ResolveIncludesTraceResult,
} from "./types";

/**
 * Expand all [[include]] directives in the source text.
 *
 * Uses Wikidot-compatible iterative expansion: each iteration replaces
 * all include directives in the current source with fetched and
 * variable-substituted content. Iteration continues until no further
 * changes occur or `maxIterations` is reached.
 */
export function resolveIncludes(
  source: string,
  fetcher: IncludeFetcher,
  options?: ResolveIncludesOptions,
): string {
  if (options?.settings && !options.settings.enablePageSyntax) {
    return source;
  }

  const maxIterations = options?.maxIterations ?? 10;
  const cachedFetcher = createCachedIncludeFetcher(fetcher, normalizePageKey);
  return expandIterative(source, cachedFetcher, maxIterations);
}

/**
 * Expand all [[include]] directives and return dependency/iteration trace data.
 *
 * This follows the same sync expansion behavior as {@link resolveIncludes};
 * the additional trace data is intended for application-level dependency
 * graphs, cache invalidation, and diagnostics.
 */
export function resolveIncludesWithTrace(
  source: string,
  fetcher: IncludeFetcher,
  options?: ResolveIncludesOptions,
): ResolveIncludesTraceResult {
  if (options?.settings && !options.settings.enablePageSyntax) {
    return {
      source,
      dependencies: [],
      iterations: [],
      reachedMaxIterations: false,
    };
  }

  const maxIterations = options?.maxIterations ?? 10;
  const cachedFetcher = createCachedIncludeFetcher(fetcher, normalizePageKey);
  return expandIterativeWithTrace(source, cachedFetcher, maxIterations);
}

/**
 * Async version of {@link resolveIncludes}.
 *
 * Expand all [[include]] directives using an async fetcher, allowing
 * page content to be loaded from async sources such as databases.
 */
export async function resolveIncludesAsync(
  source: string,
  fetcher: AsyncIncludeFetcher,
  options?: ResolveIncludesOptions,
): Promise<string> {
  return (await resolveIncludesAsyncWithTrace(source, fetcher, options)).source;
}

/**
 * Async include expansion with dependency and iteration trace data.
 */
export async function resolveIncludesAsyncWithTrace(
  source: string,
  fetcher: AsyncIncludeFetcher,
  options?: ResolveIncludesOptions,
): Promise<ResolveIncludesTraceResult> {
  if (options?.settings && !options.settings.enablePageSyntax) {
    return {
      source,
      dependencies: [],
      iterations: [],
      reachedMaxIterations: false,
    };
  }

  const maxIterations = options?.maxIterations ?? 10;
  const cachedFetcher = createCachedAsyncIncludeFetcher(fetcher, normalizePageKey);
  return expandIterativeAsyncWithTrace(source, cachedFetcher, maxIterations);
}

/**
 * Resolve includes while leaving selected directives untouched for the
 * high-level parser pipeline to render literally.
 *
 * This helper is intentionally not exported from the package barrel so the
 * public low-level resolver contract remains unchanged.
 */
export async function resolveIncludesAsyncWithTraceSelective(
  source: string,
  fetcher: AsyncIncludeFetcher,
  shouldDefer: (reference: IncludeReference) => boolean,
  options?: ResolveIncludesOptions,
): Promise<ResolveIncludesTraceResult> {
  if (options?.settings && !options.settings.enablePageSyntax) {
    return {
      source,
      dependencies: [],
      iterations: [],
      reachedMaxIterations: false,
    };
  }

  const maxIterations = options?.maxIterations ?? 10;
  const cachedFetcher = createCachedAsyncIncludeFetcher(fetcher, normalizePageKey);
  return expandIterativeAsyncWithTrace(source, cachedFetcher, maxIterations, shouldDefer);
}

/**
 * Normalize a PageRef into a consistent string key for cache lookups.
 *
 * Page names are lowercased for case-insensitive matching. Cross-site
 * references include the site name as a prefix.
 */
function normalizePageKey(location: PageRef): string {
  const site = location.site ?? "";
  const page = location.page.toLowerCase();
  return site ? `${site}:${page}` : page;
}
