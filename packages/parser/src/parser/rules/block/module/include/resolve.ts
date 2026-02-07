/**
 * Include resolution (text-level expansion)
 *
 * Expands [[include]] directives at the text level before parsing,
 * allowing block structures (like div) to span across include boundaries.
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
 * Parse an include directive's inner content into page reference and variables.
 */
function parseIncludeDirective(inner: string): { location: PageRef; variables: VariableMap } {
  // Remove newlines and normalize whitespace within segments
  const normalized = inner.replace(/\n/g, " ");

  // Split by pipe to get target and variable assignments
  const parts = normalized.split("|");
  const target = parts[0]!.trim();

  const variables: VariableMap = {};
  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i]!.trim();
    if (!segment) continue;
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
 * Recursively expand include directives in source text.
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
 * Normalize a PageRef into a string key for cache and circular detection.
 */
function normalizePageKey(location: PageRef): string {
  const site = location.site ?? "";
  const page = location.page.toLowerCase();
  return site ? `${site}:${page}` : page;
}

/**
 * Substitute variables in content.
 * Replaces {$key} with the corresponding value from the variables map.
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
 * Escape special RegExp characters in a string.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
