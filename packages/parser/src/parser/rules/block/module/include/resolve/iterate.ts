import { scanIncludeDirectives } from "../scanner";
import { createIncludeReference } from "../references";
import { replaceOneInclude, replaceOneIncludeAsync } from "./replace";
import type {
  AsyncIncludeFetcher,
  IncludeDependency,
  IncludeFetcher,
  IncludeReference,
  ResolveIncludesTraceResult,
} from "./types";

const MAYBE_INCLUDE_PATTERN = /\[\[include\s/i;

/**
 * Iteratively expand all `[[include]]` directives in source text.
 *
 * Each iteration replaces every include directive in the current source
 * with its fetched content after variable substitution. No recursion
 * into individual includes: the next iteration handles nested includes.
 */
export function expandIterative(
  source: string,
  fetcher: IncludeFetcher,
  maxIterations: number,
): string {
  let current = source;
  const replacementCache = new Map<string, string>();
  for (let i = 0; i < maxIterations; i++) {
    const expanded = expandOneIteration(current, fetcher, replacementCache);
    if (expanded === null || expanded === current) break;
    current = expanded;
  }
  return current;
}

/**
 * Trace-enabled version of {@link expandIterative}.
 *
 * The expansion behavior is identical to the normal sync path; this function
 * additionally records directives seen at each iteration so callers can build
 * dependency graphs and debug max-iteration leftovers.
 */
export function expandIterativeWithTrace(
  source: string,
  fetcher: IncludeFetcher,
  maxIterations: number,
): ResolveIncludesTraceResult {
  let current = source;
  const replacementCache = new Map<string, string>();
  const dependencies: IncludeDependency[] = [];
  const iterations: ResolveIncludesTraceResult["iterations"] = [];

  for (let i = 0; i < maxIterations; i++) {
    const expanded = expandOneIterationWithTrace(current, fetcher, replacementCache, i);
    if (expanded === null) break;

    dependencies.push(...expanded.dependencies);
    iterations.push({
      iteration: i,
      directives: expanded.references,
      changed: expanded.source !== current,
    });

    // Stable self-includes can keep scanning as directives forever; Wikidot-style
    // expansion stops when a whole iteration no longer changes the source.
    if (expanded.source === current) break;
    current = expanded.source;
  }

  return {
    source: current,
    dependencies,
    iterations,
    // Hitting the cap only matters when the final source still contains a
    // recognizable include directive. A fully expanded document can use exactly
    // maxIterations passes without leaving work behind.
    reachedMaxIterations:
      iterations.length === maxIterations && scanIncludeDirectives(current).length > 0,
  };
}

/**
 * Async iterative expansion of `[[include]]` directives.
 *
 * Each iteration scans the current source for include directives, fetches
 * sibling includes concurrently, and builds the replacement string in source
 * order. Nested includes introduced by replacements are still handled by the
 * next iteration.
 */
export async function expandIterativeAsync(
  source: string,
  fetcher: AsyncIncludeFetcher,
  maxIterations: number,
): Promise<string> {
  let current = source;
  const replacementCache = new Map<string, Promise<string>>();
  for (let i = 0; i < maxIterations; i++) {
    const expanded = await expandOneIterationAsync(current, fetcher, replacementCache);
    if (expanded === null || expanded === current) break;
    current = expanded;
  }
  return current;
}

/** Async counterpart of {@link expandIterativeWithTrace}. */
export async function expandIterativeAsyncWithTrace(
  source: string,
  fetcher: AsyncIncludeFetcher,
  maxIterations: number,
  shouldDefer?: (reference: IncludeReference) => boolean,
): Promise<ResolveIncludesTraceResult> {
  let current = source;
  const replacementCache = new Map<string, Promise<string>>();
  const dependencies: IncludeDependency[] = [];
  const iterations: ResolveIncludesTraceResult["iterations"] = [];

  for (let i = 0; i < maxIterations; i++) {
    const expanded = await expandOneIterationAsyncWithTrace(
      current,
      fetcher,
      replacementCache,
      i,
      shouldDefer,
    );
    if (expanded === null) break;

    dependencies.push(...expanded.dependencies);
    iterations.push({
      iteration: i,
      directives: expanded.references,
      changed: expanded.source !== current,
    });

    if (expanded.source === current) break;
    current = expanded.source;
  }

  return {
    source: current,
    dependencies,
    iterations,
    reachedMaxIterations:
      iterations.length === maxIterations && hasResolvableDirectives(current, shouldDefer),
  };
}

function expandOneIteration(
  source: string,
  fetcher: IncludeFetcher,
  replacementCache: Map<string, string>,
): string | null {
  if (!MAYBE_INCLUDE_PATTERN.test(source)) return null;

  const directives = scanIncludeDirectives(source);
  if (directives.length === 0) return null;

  const parts: string[] = [];
  let lastPos = 0;
  for (const { start, end, inner } of directives) {
    parts.push(source.slice(lastPos, start), replaceCached(inner, fetcher, replacementCache));
    lastPos = end;
  }
  parts.push(source.slice(lastPos));
  return parts.join("");
}

function expandOneIterationWithTrace(
  source: string,
  fetcher: IncludeFetcher,
  replacementCache: Map<string, string>,
  iteration: number,
): {
  source: string;
  references: IncludeReference[];
  dependencies: IncludeDependency[];
} | null {
  if (!MAYBE_INCLUDE_PATTERN.test(source)) return null;

  const directives = scanIncludeDirectives(source);
  if (directives.length === 0) return null;

  const references = directives.map(createIncludeReference);
  const dependencies = references.map((reference) => ({ ...reference, iteration }));
  const parts: string[] = [];
  let lastPos = 0;
  for (const { start, end, inner } of directives) {
    parts.push(source.slice(lastPos, start), replaceCached(inner, fetcher, replacementCache));
    lastPos = end;
  }
  parts.push(source.slice(lastPos));

  return {
    source: parts.join(""),
    references,
    dependencies,
  };
}

async function expandOneIterationAsync(
  source: string,
  fetcher: AsyncIncludeFetcher,
  replacementCache: Map<string, Promise<string>>,
): Promise<string | null> {
  if (!MAYBE_INCLUDE_PATTERN.test(source)) return null;

  const directives = scanIncludeDirectives(source);
  if (directives.length === 0) return null;

  const replacements = await Promise.all(
    directives.map(({ inner }) => replaceCachedAsync(inner, fetcher, replacementCache)),
  );

  const parts: string[] = [];
  let lastPos = 0;
  for (let i = 0; i < directives.length; i++) {
    const { start, end } = directives[i]!;
    parts.push(source.slice(lastPos, start), replacements[i]!);
    lastPos = end;
  }
  parts.push(source.slice(lastPos));
  return parts.join("");
}

async function expandOneIterationAsyncWithTrace(
  source: string,
  fetcher: AsyncIncludeFetcher,
  replacementCache: Map<string, Promise<string>>,
  iteration: number,
  shouldDefer?: (reference: IncludeReference) => boolean,
): Promise<{
  source: string;
  references: IncludeReference[];
  dependencies: IncludeDependency[];
} | null> {
  if (!MAYBE_INCLUDE_PATTERN.test(source)) return null;

  const directives = scanIncludeDirectives(source);
  if (directives.length === 0) return null;

  const references = directives.map(createIncludeReference);
  const deferred = references.map((reference) => shouldDefer?.(reference) ?? false);
  const replacements = await Promise.all(
    directives.map((directive, index) =>
      deferred[index]
        ? Promise.resolve(source.slice(directive.start, directive.end))
        : replaceCachedAsync(directive.inner, fetcher, replacementCache),
    ),
  );
  const parts: string[] = [];
  let lastPos = 0;

  for (let i = 0; i < directives.length; i++) {
    const { start, end } = directives[i]!;
    parts.push(source.slice(lastPos, start), replacements[i]!);
    lastPos = end;
  }
  parts.push(source.slice(lastPos));

  return {
    source: parts.join(""),
    references,
    dependencies: references
      .filter((_, index) => !deferred[index])
      .map((reference) => ({ ...reference, iteration })),
  };
}

function hasResolvableDirectives(
  source: string,
  shouldDefer: ((reference: IncludeReference) => boolean) | undefined,
): boolean {
  const directives = scanIncludeDirectives(source);
  if (!shouldDefer) return directives.length > 0;
  return directives.some((directive) => !shouldDefer(createIncludeReference(directive)));
}

function replaceCached(inner: string, fetcher: IncludeFetcher, cache: Map<string, string>): string {
  const cached = cache.get(inner);
  if (cached !== undefined) return cached;

  const replacement = replaceOneInclude(inner, fetcher);
  cache.set(inner, replacement);
  return replacement;
}

function replaceCachedAsync(
  inner: string,
  fetcher: AsyncIncludeFetcher,
  cache: Map<string, Promise<string>>,
): Promise<string> {
  const cached = cache.get(inner);
  if (cached) return cached;

  const replacement = replaceOneIncludeAsync(inner, fetcher);
  cache.set(inner, replacement);
  return replacement;
}
