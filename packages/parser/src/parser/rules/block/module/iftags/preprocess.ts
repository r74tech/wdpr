/**
 *
 * Text-level expansion of `[[iftags]]` blocks before parsing.
 *
 * Unlike the AST-level {@link resolveIfTags} resolver, which evaluates
 * `if-tags` nodes after parsing, this pass operates directly on the
 * raw wikitext source. The difference matters for templates that embed
 * an `[[iftags]]` block inside another construct's attribute string,
 * for example:
 *
 * ```wikitext
 * [[div_ class="x" [[iftags +foo]]style="display:none;"[[/iftags]]]]
 * ```
 *
 * The block-level tokenizer cannot recover a well-formed opener from
 * that input — the inner `[[iftags ...]]X[[/iftags]]` has to collapse
 * to either `X` or the empty string *before* the parser sees the outer
 * tag, so the attribute string becomes plain text again.
 *
 * `pageTags` semantics:
 *
 * - `string[]`: full pass. Every `[[iftags]]` is evaluated against the
 *   given tag set and collapses to either its body or the empty string.
 *   The AST will contain no `if-tags` nodes after parsing.
 * - `null`: tags are unknown (e.g. draft preview, fixture test).
 *   The pass still runs but only collapses `[[iftags]]` blocks that are
 *   embedded inside another block's opener (`[[name ... [[iftags ...]]X[[/iftags]] ... ]]`).
 *   Block-level `[[iftags]]` are left alone for {@link resolveIfTags}
 *   to evaluate later when real tags are supplied via `getPageTags`.
 *   Opener-embedded iftags are collapsed using an empty-tag assumption
 *   (i.e. `+tag` conditions fail, `-tag` conditions pass). This is a
 *   lossy fallback that keeps the outer block parseable; callers that
 *   need accurate rendering should pass the real tags as `string[]`.
 *
 * Pipeline order (when invoked via `parse()`):
 *
 * ```
 * getPageTags → resolveIncludes → parse({ pageTags }) → resolveModules
 * ```
 *
 * Running this after include expansion is intentional: an included
 * page may itself embed `[[iftags]]`, and the condition is evaluated
 * against the *including* page's tags, not the included page's.
 *
 * @module
 */

import { parseTagCondition, evaluateTagCondition } from "./condition";
import {
  computeBracketDepths,
  makeUniqueSentinels,
  maskRawRegions,
  restorePlaceholders,
} from "../../../../preprocess/utils";

/**
 * Matches one `[[iftags ...]]X[[/iftags]]` where `X` contains no further
 * `[[iftags]]` opener or closer. Used for innermost-first reduction.
 *
 * - `g` (global): a single `replace` pass rewrites every innermost block,
 *   so sibling blocks collapse together and the reduction loop runs once
 *   per nesting level rather than once per block.
 * - `i` (case-insensitive): Wikidot block names are case-insensitive
 * - `s` (dot matches newline): bodies can span multiple lines
 * - `[^\]]*` for the condition: tag-condition tokens (`+tag`, `-tag`,
 *   bare names) never contain `]`, and stopping at the first `]` keeps
 *   the regex linear in body length even on degenerate input.
 */
const INNERMOST_IFTAGS_PATTERN =
  /\[\[\s*iftags\b([^\]]*)\]\]((?:(?!\[\[\s*iftags\b|\[\[\/\s*iftags\s*\]\]).)*)\[\[\/\s*iftags\s*\]\]/gis;

/**
 * Expand `[[iftags ...]]X[[/iftags]]` directives in `source` against the
 * current page's tags.
 *
 * Behaviour:
 * - Raw regions (`[[code]]`, `[[html]]`, `@@...@@`, `@<...>@`) are
 *   protected: literal `[[iftags]]` tokens inside them are not expanded.
 * - Nested `[[iftags]]` are processed innermost-first, so an outer
 *   block can re-process the now-flattened inner body uniformly.
 * - `pageTags === null`: only `[[iftags]]` blocks embedded inside
 *   another block's opener are collapsed (using an empty-tag fallback
 *   so `+tag` conditions fail and `-tag` conditions pass). Block-level
 *   iftags are left intact for the AST-level resolver.
 *
 * @param source   Raw wikitext (typically after include expansion).
 * @param pageTags Tags of the page being rendered, or `null` for the
 *                 opener-embedded-only fallback mode.
 * @returns Source with matching iftags replaced by their bodies and
 *          unmatched iftags removed entirely.
 */
export function preprocessIftags(source: string, pageTags: string[] | null): string {
  if (!source.includes("[[")) return source; // fast path

  const sentinels = makeUniqueSentinels(source);
  const { masked, placeholders } = maskRawRegions(source, sentinels);
  const reduced = reduceIftags(masked, pageTags);
  return restorePlaceholders(reduced, placeholders, sentinels);
}

/**
 * Replace `[[iftags ...]]X[[/iftags]]` blocks innermost-first until no
 * iftags pair remains.
 *
 * Behaviour by `pageTags`:
 * - `string[]`: every match collapses to body / empty based on tag membership.
 * - `null`: only matches whose start offset has `bracketDepth > 0`
 *   (i.e. embedded inside an outer block opener) are collapsed, using
 *   an empty-tag assumption. Block-level matches are returned verbatim
 *   so {@link resolveIfTags} can evaluate them later.
 *
 * The loop terminates when a pass changes nothing.
 */
function reduceIftags(source: string, pageTags: string[] | null): string {
  let current = source;
  // Worst-case bound: one pass eliminates at least one nesting level, and
  // nesting depth is at most `source.length`. The explicit cap stops a
  // runaway regex (e.g. pathological zero-width match) from looping forever.
  const maxIterations = source.length + 1;
  const tagSet: string[] = pageTags ?? [];
  for (let i = 0; i < maxIterations; i++) {
    const depths = pageTags === null ? computeBracketDepths(current) : null;
    let changed = false;
    const next = current.replace(
      INNERMOST_IFTAGS_PATTERN,
      (match, cond: string, body: string, offset: number) => {
        if (depths !== null && depths[offset] === 0) {
          // block-level iftags in `null` mode → leave for AST resolver
          return match;
        }
        changed = true;
        const condition = parseTagCondition(cond);
        return evaluateTagCondition(condition, tagSet) ? body : "";
      },
    );
    if (!changed) return current;
    current = next;
  }
  return current;
}
