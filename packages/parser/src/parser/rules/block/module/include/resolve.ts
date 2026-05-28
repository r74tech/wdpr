/**
 *
 * Text-level expansion of `[[include]]` directives.
 *
 * Unlike most Wikidot constructs that are handled during AST parsing, include
 * directives are resolved as a text-level macro expansion BEFORE the main parse.
 * This is necessary because included content may contain partial block structures
 * (e.g., an opening `[[div]]` tag in one include and its closing `[[/div]]` in
 * another) that must be visible to the parser as a single continuous text.
 *
 * The resolution process follows Wikidot's iterative (do-while) approach:
 * 1. Scan the entire source text for `[[include page | var=val]]` patterns
 * 2. Replace ALL matches in one pass (each fetched, variable-substituted)
 * 3. Compare the result with the previous source
 * 4. Repeat until no changes occur or `maxIterations` is reached
 *
 * This differs from a DFS recursive approach: each iteration expands one
 * "layer" of includes across the whole source, rather than drilling into
 * each include immediately. This allows patterns like inc-loop (where the
 * same page is included with different variables across iterations) to work.
 *
 * @module
 */

import type { PageRef, VariableMap, WikitextSettings } from "@wdprlib/ast";

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
 * Options for resolveIncludes / resolveIncludesAsync
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
 * Expand all [[include]] directives in the source text.
 *
 * Uses Wikidot-compatible iterative expansion: each iteration replaces
 * all include directives in the current source with fetched (and
 * variable-substituted) content. Iteration continues until no further
 * changes occur or `maxIterations` is reached.
 *
 * @example
 * ```ts
 * const expanded = resolveIncludes(source, fetcher);
 * const ast = parse(expanded);
 * ```
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
  const cache = new Map<string, string | null>();

  const cachedFetcher: IncludeFetcher = (pageRef: PageRef) => {
    const key = normalizePageKey(pageRef);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    let result: string | null;
    try {
      result = fetcher(pageRef);
    } catch {
      result = null;
    }
    cache.set(key, result);
    return result;
  };

  return expandIterative(source, cachedFetcher, maxIterations);
}

/**
 * Async version of {@link resolveIncludes}.
 *
 * Expand all [[include]] directives using an async fetcher, allowing
 * page content to be loaded from async sources such as databases.
 *
 * @example
 * ```ts
 * const expanded = await resolveIncludesAsync(source, async (ref) => {
 *   return await db.getPageContent(ref.page);
 * });
 * const ast = parse(expanded);
 * ```
 */
export async function resolveIncludesAsync(
  source: string,
  fetcher: AsyncIncludeFetcher,
  options?: ResolveIncludesOptions,
): Promise<string> {
  if (options?.settings && !options.settings.enablePageSyntax) {
    return source;
  }

  const maxIterations = options?.maxIterations ?? 10;
  const cache = new Map<string, string | null>();

  const cachedFetcher: AsyncIncludeFetcher = async (pageRef: PageRef) => {
    const key = normalizePageKey(pageRef);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    let result: string | null;
    try {
      result = await fetcher(pageRef);
    } catch {
      result = null;
    }
    cache.set(key, result);
    return result;
  };

  return expandIterativeAsync(source, cachedFetcher, maxIterations);
}

/**
 * Matches the opening `[[include` token at the start of a line.
 *
 * The `m` flag makes `^` match at line boundaries, enforcing the Wikidot
 * rule that `[[include]]` must appear at the start of a line. The trailing
 * `\s` separates the directive name from its arguments. The actual extent
 * of each directive is found by {@link scanIncludeDirectives}, which
 * balances nested `[[ ... ]]` so that block markup inside a parameter
 * value does not terminate the directive at the first `]]`.
 */
const INCLUDE_OPEN_PATTERN = /^\[\[include\s/gim;

/** A located `[[include ...]]` directive with bracket-balanced extent. */
interface IncludeDirectiveMatch {
  /** Index of the opening `[[`. */
  start: number;
  /** Index just past the closing `]]`. */
  end: number;
  /** Text between `[[include ` and the closing `]]`. */
  inner: string;
}

/**
 * Returns `true` when everything between `pos` and the next newline (or
 * end of string) is whitespace — i.e. `pos` sits at the end of its line.
 */
function isRestOfLineBlank(source: string, pos: number): boolean {
  for (let i = pos; i < source.length; i++) {
    const ch = source[i];
    if (ch === "\n") return true;
    if (ch !== " " && ch !== "\t" && ch !== "\r") return false;
  }
  return true; // reached EOF with only whitespace
}

/**
 * Find all `[[include ...]]` directives in `source`, choosing each
 * closing `]]` so that block markup inside a parameter value does not
 * end the directive prematurely.
 *
 * A parameter value can contain nested `[[ ... ]]` (e.g. a `[[span]]`
 * run) or a stray `]]`. The directive closes at the first `]]` that
 * drives the `[[`/`]]` depth to zero or below AND is positioned as a
 * real terminator, which (matching the observed Wikidot behaviour) means
 * either:
 *
 * - it is on the opener's own line — a single-line / inline directive
 *   like `[[include x ...]]` (and `[[include x]] trailing` closes right
 *   after the first balanced `]]`, leaving the trailing text alone); or
 * - it sits at the end of a line (only whitespace before the newline) —
 *   the standalone `]]` that terminates a multi-line directive.
 *
 * A mid-line `]]` on a continuation line — whether part of balanced
 * markup or a bare symbol — therefore does not close the directive, so
 * captions such as `[[span]]...[[/span]]` survive intact.
 *
 * `[[[link]]]` is handled by plain `[[`/`]]` counting (a `[[[` is a `[[`
 * plus a literal `[`, and `]]]` a `]]` plus a literal `]`); the literal
 * text is preserved because the value is sliced, not tokenised. The one
 * case this does not reconstruct is a triple-bracket link butted
 * directly against the closing `]]` on the same line (`...[[[p]]]]]`),
 * which is left as a known limitation rather than special-cased.
 *
 * Openers that never reach depth zero are left untouched.
 */
function scanIncludeDirectives(source: string): IncludeDirectiveMatch[] {
  const matches: IncludeDirectiveMatch[] = [];
  const opener = new RegExp(INCLUDE_OPEN_PATTERN.source, INCLUDE_OPEN_PATTERN.flags);
  let m: RegExpExecArray | null;

  while ((m = opener.exec(source)) !== null) {
    const start = m.index;
    const contentStart = start + m[0].length;
    const firstNewline = source.indexOf("\n", start);

    let depth = 0;
    let i = start;
    let closeEnd = -1;
    while (i < source.length) {
      if (source.startsWith("[[", i)) {
        depth++;
        i += 2;
      } else if (source.startsWith("]]", i)) {
        const closeStart = i;
        depth--;
        i += 2;
        if (depth <= 0) {
          const onOpenerLine = firstNewline === -1 || closeStart < firstNewline;
          if (onOpenerLine || isRestOfLineBlank(source, i)) {
            closeEnd = i;
            break;
          }
        }
      } else {
        i++;
      }
    }

    if (closeEnd === -1) {
      // No terminating `]]` (opener-line or line-end) found — leave the
      // opener untouched and resume scanning just past it so a later,
      // well-formed directive can still match.
      opener.lastIndex = start + 2;
      continue;
    }

    matches.push({ start, end: closeEnd, inner: source.slice(contentStart, closeEnd - 2) });
    opener.lastIndex = closeEnd;
  }

  return matches;
}

/**
 * Parse the inner content of an `[[include ...]]` directive into a page reference
 * and variable assignments.
 *
 * The inner content has the format: `page-name key1=value1 | key2=value2`
 * where variable assignments can appear space-separated after the page name
 * in the first segment (before any pipe), as well as in pipe-separated segments.
 * The page name may include a cross-site prefix (`:site-name:page-name`).
 *
 * @param inner - The text between `[[include` and `]]`
 * @returns Object containing the parsed page location and variable map
 */
function parseIncludeDirective(inner: string): { location: PageRef; variables: VariableMap } {
  // Remove newlines and normalize whitespace within segments
  const normalized = inner.replace(/\n/g, " ");

  // Split by pipe to get target and variable assignments
  const parts = normalized.split("|");
  const firstSegment = parts[0]!.trim();

  // Separate page name from space-separated parameters in the first segment.
  // e.g. "component:coltop show=+ 開く" → target="component:coltop", rest="show=+ 開く"
  const spaceIndex = firstSegment.indexOf(" ");
  let target: string;
  const varSegments: string[] = [];

  if (spaceIndex !== -1) {
    target = firstSegment.slice(0, spaceIndex);
    const rest = firstSegment.slice(spaceIndex + 1).trim();
    if (rest) {
      varSegments.push(rest);
    }
  } else {
    target = firstSegment;
  }

  // Collect pipe-separated variable segments
  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i]!.trim();
    if (segment) {
      varSegments.push(segment);
    }
  }

  // Build the variable map, honouring Wikidot's default-value idiom.
  //
  // A template supplies a default for a forwarded variable by repeating
  // the key: `key={$key} | key=default`. Once the outer include has
  // substituted `{$key}`, that segment pair becomes one of:
  //   - `key=value | key=default`        (caller supplied a value)
  //   - `key= | key=default`             (caller passed an empty value)
  //   - `key={$key} | key=default`       (caller omitted it; placeholder
  //                                        left unresolved)
  // The intended result is "use the caller's value if present, else the
  // default", so the FIRST *concrete* value for a key wins. An empty
  // string or a still-unresolved `{$...}` placeholder is not concrete and
  // lets a later default apply.
  //
  // A key seen only with empty/placeholder values keeps that (empty or
  // literal) value, preserving the existing pass-through behaviour for
  // genuinely unset variables.
  const variables: VariableMap = {};
  const hasConcrete = new Set<string>();
  for (const segment of varSegments) {
    const eqIndex = segment.indexOf("=");
    if (eqIndex === -1) continue;
    const key = segment.slice(0, eqIndex).trim();
    if (!key) continue;
    const value = segment.slice(eqIndex + 1).trim();

    const isPlaceholder = /^\{\$[^}]*\}$/.test(value);
    const isConcrete = value !== "" && !isPlaceholder;

    if (isConcrete) {
      if (!hasConcrete.has(key)) {
        variables[key] = value;
        hasConcrete.add(key);
      }
      // A later concrete value for the same key is a default; ignore it.
    } else if (!Object.hasOwn(variables, key)) {
      // First empty/placeholder occurrence — keep it unless a concrete
      // value (earlier or later) replaces it via the branch above.
      // `Object.hasOwn` (not `in`) so keys like `toString` / `constructor`
      // are not mistaken for already-present via the prototype chain.
      variables[key] = value;
    }
  }

  // Parse page reference
  let location: PageRef;
  if (target.startsWith(":")) {
    const rest = target.slice(1);
    const colonIndex = rest.indexOf(":");
    if (colonIndex !== -1) {
      location = { site: rest.slice(0, colonIndex), page: rest.slice(colonIndex + 1) };
    } else {
      location = { site: null, page: target };
    }
  } else {
    location = { site: null, page: target };
  }

  return { location, variables };
}

/**
 * Replace a single include match with its fetched + variable-substituted content.
 * Returns the replacement text for a single directive's `inner` content.
 */
function replaceOneInclude(inner: string, fetcher: IncludeFetcher): string {
  const { location, variables } = parseIncludeDirective(inner);
  const content = fetcher(location);
  if (content === null) {
    return `[[div class="error-block"]]\nPage to be included "${location.page}" cannot be found!\n[[/div]]`;
  }
  return substituteVariables(content, variables);
}

/**
 * Iteratively expand all `[[include]]` directives in source text.
 *
 * Each iteration replaces every include directive in the current source
 * with its fetched content (after variable substitution). No recursion
 * into individual includes — the next iteration handles nested includes.
 *
 * Stops when the source is unchanged (no includes left or all resolved)
 * or `maxIterations` is reached.
 */
function expandIterative(source: string, fetcher: IncludeFetcher, maxIterations: number): string {
  let current = source;
  for (let i = 0; i < maxIterations; i++) {
    const directives = scanIncludeDirectives(current);
    if (directives.length === 0) break;

    let result = "";
    let lastPos = 0;
    for (const { start, end, inner } of directives) {
      result += current.slice(lastPos, start);
      result += replaceOneInclude(inner, fetcher);
      lastPos = end;
    }
    result += current.slice(lastPos);

    if (result === current) break;
    current = result;
  }
  return current;
}

/**
 * Async iterative expansion of `[[include]]` directives.
 *
 * Each iteration scans the current source for include directives using
 * RegExp.exec(), fetches content sequentially (to preserve cache semantics),
 * and builds the replacement string. A fresh RegExp is created per iteration
 * to avoid lastIndex conflicts.
 */
async function expandIterativeAsync(
  source: string,
  fetcher: AsyncIncludeFetcher,
  maxIterations: number,
): Promise<string> {
  let current = source;
  for (let i = 0; i < maxIterations; i++) {
    const directives = scanIncludeDirectives(current);
    if (directives.length === 0) break;

    let result = "";
    let lastPos = 0;
    for (const { start, end, inner } of directives) {
      result += current.slice(lastPos, start);

      const { location, variables } = parseIncludeDirective(inner);
      const content = await fetcher(location);
      if (content === null) {
        result += `[[div class="error-block"]]\nPage to be included "${location.page}" cannot be found!\n[[/div]]`;
      } else {
        result += substituteVariables(content, variables);
      }

      lastPos = end;
    }

    result += current.slice(lastPos);
    if (result === current) break;
    current = result;
  }
  return current;
}

/**
 * Normalize a PageRef into a consistent string key for cache lookups.
 *
 * Page names are lowercased for case-insensitive matching. Cross-site
 * references include the site name as a prefix.
 *
 * @param location - The page reference to normalize
 * @returns A normalized string key (e.g., "page-name" or "site:page-name")
 */
function normalizePageKey(location: PageRef): string {
  const site = location.site ?? "";
  const page = location.page.toLowerCase();
  return site ? `${site}:${page}` : page;
}

/**
 * Substitute variables in included page content.
 *
 * Replaces `{$key}` patterns with the corresponding value from the variables
 * map provided in the include directive (e.g., `[[include page | key=value]]`).
 *
 * @param content - The fetched page content containing `{$key}` placeholders
 * @param variables - Key-value pairs from the include directive
 * @returns Content with all matching variables substituted
 */
function substituteVariables(content: string, variables: VariableMap): string {
  if (Object.keys(variables).length === 0) return content;

  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const escaped = escapeRegExp(key);
    result = result.replace(new RegExp(`\\{\\$${escaped}\\}`, "g"), value);
  }
  return result;
}

/**
 * Escape special RegExp characters in a string so it can be safely used
 * in a `new RegExp()` constructor.
 *
 * @param str - The string to escape
 * @returns The escaped string with all regex special characters prefixed with backslash
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
