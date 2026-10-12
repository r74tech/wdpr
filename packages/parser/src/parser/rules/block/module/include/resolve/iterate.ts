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

/** Returned when an iteration's result would exceed the length limit. */
const OVER_LIMIT = Symbol("include expansion over limit");
type IterationSource = string | typeof OVER_LIMIT;

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
  maxLength: number,
): string {
  let current = source;
  const replacementCache = new Map<string, string>();
  for (let i = 0; i < maxIterations; i++) {
    const expanded = expandOneIteration(current, fetcher, replacementCache, maxLength);
    if (expanded === null || expanded === OVER_LIMIT || expanded === current) break;
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
  maxLength: number,
): ResolveIncludesTraceResult {
  let current = source;
  const replacementCache = new Map<string, string>();
  const dependencies: IncludeDependency[] = [];
  const iterations: ResolveIncludesTraceResult["iterations"] = [];
  let reachedMaxLength = false;

  for (let i = 0; i < maxIterations; i++) {
    const expanded = expandOneIterationWithTrace(current, fetcher, replacementCache, i, maxLength);
    if (expanded === null) break;
    // The discarded iteration is not traced, so the trace matches the returned source.
    if (expanded.source === OVER_LIMIT) {
      reachedMaxLength = true;
      break;
    }

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
    reachedMaxLength,
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
  maxLength: number,
): Promise<string> {
  let current = source;
  const replacementCache = new Map<string, Promise<string>>();
  for (let i = 0; i < maxIterations; i++) {
    const expanded = await expandOneIterationAsync(current, fetcher, replacementCache, maxLength);
    if (expanded === null || expanded === OVER_LIMIT || expanded === current) break;
    current = expanded;
  }
  return current;
}

/** Async counterpart of {@link expandIterativeWithTrace}. */
export async function expandIterativeAsyncWithTrace(
  source: string,
  fetcher: AsyncIncludeFetcher,
  maxIterations: number,
  maxLength: number,
  shouldDefer?: (reference: IncludeReference) => boolean,
): Promise<ResolveIncludesTraceResult> {
  let current = source;
  const replacementCache = new Map<string, Promise<string>>();
  const dependencies: IncludeDependency[] = [];
  const iterations: ResolveIncludesTraceResult["iterations"] = [];
  let reachedMaxLength = false;

  for (let i = 0; i < maxIterations; i++) {
    const expanded = await expandOneIterationAsyncWithTrace(
      current,
      fetcher,
      replacementCache,
      i,
      maxLength,
      shouldDefer,
    );
    if (expanded === null) break;
    if (expanded.source === OVER_LIMIT) {
      reachedMaxLength = true;
      break;
    }

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
    reachedMaxLength,
  };
}

function expandOneIteration(
  source: string,
  fetcher: IncludeFetcher,
  replacementCache: Map<string, string>,
  maxLength: number,
): IterationSource | null {
  if (!MAYBE_INCLUDE_PATTERN.test(source)) return null;

  const directives = scanIncludeDirectives(source);
  if (directives.length === 0) return null;

  return assembleIteration(source, directives, maxLength, ({ inner }) =>
    replaceCached(inner, fetcher, replacementCache),
  );
}

function expandOneIterationWithTrace(
  source: string,
  fetcher: IncludeFetcher,
  replacementCache: Map<string, string>,
  iteration: number,
  maxLength: number,
): {
  source: IterationSource;
  references: IncludeReference[];
  dependencies: IncludeDependency[];
} | null {
  if (!MAYBE_INCLUDE_PATTERN.test(source)) return null;

  const directives = scanIncludeDirectives(source);
  if (directives.length === 0) return null;

  const references = directives.map(createIncludeReference);
  return {
    source: assembleIteration(source, directives, maxLength, ({ inner }) =>
      replaceCached(inner, fetcher, replacementCache),
    ),
    references,
    dependencies: references.map((reference) => ({ ...reference, iteration })),
  };
}

async function expandOneIterationAsync(
  source: string,
  fetcher: AsyncIncludeFetcher,
  replacementCache: Map<string, Promise<string>>,
  maxLength: number,
): Promise<IterationSource | null> {
  if (!MAYBE_INCLUDE_PATTERN.test(source)) return null;

  const directives = scanIncludeDirectives(source);
  if (directives.length === 0) return null;

  const replacements = await Promise.all(
    directives.map(({ inner }) => replaceCachedAsync(inner, fetcher, replacementCache)),
  );
  return assembleIteration(source, directives, maxLength, (_, index) => replacements[index]!);
}

async function expandOneIterationAsyncWithTrace(
  source: string,
  fetcher: AsyncIncludeFetcher,
  replacementCache: Map<string, Promise<string>>,
  iteration: number,
  maxLength: number,
  shouldDefer?: (reference: IncludeReference) => boolean,
): Promise<{
  source: IterationSource;
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

  return {
    source: assembleIteration(source, directives, maxLength, (_, index) => replacements[index]!),
    references,
    dependencies: references
      .filter((_, index) => !deferred[index])
      .map((reference) => ({ ...reference, iteration })),
  };
}

/**
 * Splice replacements into `source`, checking the length before joining so an
 * oversized iteration never materializes as one string.
 */
function assembleIteration(
  source: string,
  directives: readonly { start: number; end: number; inner: string }[],
  maxLength: number,
  replacementAt: (directive: { inner: string }, index: number) => string,
): IterationSource {
  const parts: string[] = [];
  let length = 0;
  let lastPos = 0;
  for (let i = 0; i < directives.length; i++) {
    const directive = directives[i]!;
    const before = source.slice(lastPos, directive.start);
    const replacement = replacementAt(directive, i);
    length += before.length + replacement.length;
    if (length > maxLength) return OVER_LIMIT;
    parts.push(before, replacement);
    lastPos = directive.end;
  }
  const rest = source.slice(lastPos);
  if (length + rest.length > maxLength) return OVER_LIMIT;
  parts.push(rest);
  return parts.join("");
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
