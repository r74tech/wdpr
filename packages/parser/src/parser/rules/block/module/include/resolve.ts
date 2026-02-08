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
 * The resolution process:
 * 1. Scan the source text for `[[include page | var=val]]` patterns
 * 2. Fetch the included page's content via the provided fetcher callback
 * 3. Apply variable substitutions (`{$key}` -> `value`)
 * 4. Recursively resolve includes in the fetched content (up to max depth)
 * 5. Replace the original `[[include ...]]` directive with the expanded text
 *
 * Safety features include circular dependency detection (using a trace of
 * visited pages) and a configurable maximum recursion depth (default: 5).
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
 * Options for resolveIncludes
 */
export interface ResolveIncludesOptions {
  /** Maximum recursion depth for nested includes (default: 5) */
  maxDepth?: number;
  /** Wikitext settings. If enablePageSyntax is false, includes are not expanded. */
  settings?: WikitextSettings;
}

/**
 * Expand all [[include]] directives in the source text.
 *
 * Include directives are treated as macro expansions: `[[include page]]`
 * is replaced with the fetched page content (after variable substitution).
 * The result is a single expanded text that can be parsed as a whole,
 * allowing block structures (like div) to span across include boundaries.
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

  const maxDepth = options?.maxDepth ?? 5;
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

  return expandText(source, cachedFetcher, 0, maxDepth, []);
}

/**
 * Regex to match [[include ...]] directives.
 * Captures the content between [[include and ]] (may span multiple lines).
 */
// \s (single char, no quantifier) avoids overlap with [^\]]* that causes polynomial backtracking
const INCLUDE_PATTERN = /\[\[include\s([^\]]*(?:\](?!\])[^\]]*)*)\]\]/gi;

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

  const variables: VariableMap = {};
  for (const segment of varSegments) {
    const eqIndex = segment.indexOf("=");
    if (eqIndex !== -1) {
      const key = segment.slice(0, eqIndex).trim();
      const value = segment.slice(eqIndex + 1).trim();
      if (key) {
        variables[key] = value;
      }
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
 * Recursively expand `[[include ...]]` directives in source text.
 *
 * Each include directive is replaced with the fetched and variable-substituted
 * page content. The expansion recurses into the fetched content to handle
 * nested includes, up to `maxDepth` levels.
 *
 * Circular includes are detected by maintaining a trace of visited page keys.
 * When a circular include is found, an error div is emitted instead.
 *
 * @param source - The text to scan for include directives
 * @param fetcher - Callback to fetch page content (with caching)
 * @param depth - Current recursion depth
 * @param maxDepth - Maximum allowed recursion depth
 * @param trace - Stack of visited page keys for circular dependency detection
 * @returns Text with all include directives expanded
 */
function expandText(
  source: string,
  fetcher: IncludeFetcher,
  depth: number,
  maxDepth: number,
  trace: string[],
): string {
  if (depth >= maxDepth) return source;

  return source.replace(INCLUDE_PATTERN, (_match, inner: string) => {
    const { location, variables } = parseIncludeDirective(inner);
    const pageKey = normalizePageKey(location);

    // Circular include detection
    if (trace.includes(pageKey)) {
      return `[[div class="error-block"]]\nCircular include detected: "${location.page}"\n[[/div]]`;
    }

    // Fetch page content
    const content = fetcher(location);
    if (content === null) {
      return `[[div class="error-block"]]\nPage to be included "${location.page}" cannot be found!\n[[/div]]`;
    }

    // Apply variable substitutions
    const substituted = substituteVariables(content, variables);

    // Recursively expand includes in the fetched content
    return expandText(substituted, fetcher, depth + 1, maxDepth, [...trace, pageKey]);
  });
}

/**
 * Normalize a PageRef into a consistent string key for cache lookups
 * and circular dependency detection.
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
