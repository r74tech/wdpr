import type { PageRef, WikitextSettings } from "@wdprlib/ast";
import type { IncludeAssignment } from "../directive";

/**
 * Callback to fetch page content for include resolution.
 * Returns the wikitext source of the page, or null if the page does not exist.
 *
 * @security The fetcher is called with user-provided page references.
 * Implementations should validate and sanitize page references before
 * using them in database queries or file system access.
 */
export type IncludeFetcher = (pageRef: PageRef) => string | null;

/**
 * Async callback to fetch page content for include resolution.
 * Returns a promise of the wikitext source, or null if the page does not exist.
 *
 * @security The fetcher is called with user-provided page references.
 * Implementations should validate and sanitize page references before
 * using them in database queries or file system access.
 */
export type AsyncIncludeFetcher = (pageRef: PageRef) => Promise<string | null>;

/**
 * Options for resolveIncludes / resolveIncludesAsync.
 */
export interface ResolveIncludesOptions {
  /**
   * Maximum number of expansion iterations (default: 10).
   *
   * Each iteration replaces all `[[include]]` directives in the current
   * source with fetched content. Iteration stops when the source is
   * unchanged or this limit is reached.
   */
  maxIterations?: number;
  /** Wikitext settings. If enablePageSyntax is false, includes are not expanded. */
  settings?: WikitextSettings;
}

/**
 * A single include directive found in raw source text.
 *
 * This represents the directive as it existed during the include expansion
 * phase. It does not imply that the target exists, and it does not include
 * nested dependencies introduced by the target source.
 */
export interface IncludeReference {
  /** Target page reference parsed from the directive. */
  location: PageRef;
  /** Variable assignments parsed from the directive, preserving source order. */
  assignments: IncludeAssignment[];
  /** Index of the opening `[[`. */
  start: number;
  /** Index just past the closing `]]`. */
  end: number;
  /** Text between `[[include ` and the closing `]]`. */
  inner: string;
}

/**
 * Include dependency observed during iterative expansion.
 *
 * Unlike `IncludeReference`, this is collected after a fetchable include layer
 * has actually been expanded. If an included page introduces another include,
 * that nested directive appears as a later `IncludeDependency` with a higher
 * `iteration`.
 */
export interface IncludeDependency extends IncludeReference {
  /** Zero-based expansion iteration where this directive was observed. */
  iteration: number;
}

/**
 * Trace data for one include expansion iteration.
 *
 * `directives` is the scan result before replacements for that iteration.
 * `changed` is false for stable self-includes where replacing the directive
 * produces the same source again; the resolver stops at that point.
 */
export interface IncludeIterationTrace {
  /** Zero-based expansion iteration. */
  iteration: number;
  /** Include directives found in the source for this iteration. */
  directives: IncludeReference[];
  /** Whether replacing the directives changed the source. */
  changed: boolean;
}

/**
 * Result returned by trace-enabled include expansion.
 *
 * The `source` field is intended to be byte-for-byte equivalent to
 * `resolveIncludes(source, fetcher, options)` for the same inputs. The rest of
 * the object is diagnostic data for dependency collection and cache planning.
 */
export interface ResolveIncludesTraceResult {
  /** Final expanded source. */
  source: string;
  /** Include dependencies observed across all expansion iterations. */
  dependencies: IncludeDependency[];
  /** Per-iteration include scan and change information. */
  iterations: IncludeIterationTrace[];
  /** True when expansion stopped with directives still present after hitting the iteration cap. */
  reachedMaxIterations: boolean;
}
