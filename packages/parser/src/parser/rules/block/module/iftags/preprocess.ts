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
 * tag, so the attribute string becomes plain text again. The AST-level
 * `[[iftags]]` block rule still exists and handles cases where the
 * preprocess pass is skipped (`pageTags === null`).
 *
 * Pipeline order:
 *
 * ```
 * getPageTags → resolveIncludes → preprocessIftags(source, pageTags) → parse → resolveModules
 * ```
 *
 * Running this after include expansion is intentional: an included
 * page may itself embed `[[iftags]]`, and the condition is evaluated
 * against the *including* page's tags, not the included page's.
 *
 * @module
 */

import { parseTagCondition, evaluateTagCondition } from "./condition";

/**
 * Base sentinel characters used to wrap raw-region placeholders during
 * the iftags scan. Both code points fall inside the Unicode Private
 * Use Area (U+E000–U+F8FF) and so they should not appear in legitimate
 * wikitext, but in case the input contains them anyway, the sentinels
 * are extended with extra copies until the resulting marker string is
 * provably absent from the source — see {@link makeUniqueSentinels}.
 */
const BASE_PLACEHOLDER_OPEN = "";
const BASE_PLACEHOLDER_CLOSE = "";

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
 * Matches `[[code ...]]` or `[[html ...]]` openers (case-insensitive).
 * The captured group is the block name so the matching closing tag can
 * be located. The sticky (`y`) flag lets the masker test for an opener
 * at a given index without slicing the source on every `[[`.
 */
const RAW_BLOCK_OPEN_PATTERN = /\[\[\s*(code|html)\b[^\]]*\]\]/iy;

/**
 * Expand `[[iftags ...]]X[[/iftags]]` directives in `source` against the
 * current page's tags.
 *
 * Returns `source` unchanged when `pageTags` is `null`, which signals
 * that the caller could not resolve tag membership (e.g. rendering a
 * draft preview without a real page). In that case the AST-level
 * resolver remains responsible for evaluation later.
 *
 * Behaviour:
 * - Raw regions (`[[code]]`, `[[html]]`, `@@...@@`, `@<...>@`) are
 *   protected: literal `[[iftags]]` tokens inside them are not expanded.
 * - Nested `[[iftags]]` are processed innermost-first, so an outer
 *   block can re-process the now-flattened inner body uniformly.
 *
 * @param source   Raw wikitext (typically after include expansion).
 * @param pageTags Tags of the page being rendered, or `null` to skip.
 * @returns Source with matching iftags replaced by their bodies and
 *          unmatched iftags removed entirely.
 */
export function preprocessIftags(source: string, pageTags: string[] | null): string {
  if (pageTags === null) return source;
  if (!source.includes("[[")) return source; // fast path

  const sentinels = makeUniqueSentinels(source);
  const { masked, placeholders } = maskRawRegions(source, sentinels);
  const reduced = reduceIftags(masked, pageTags);
  return restorePlaceholders(reduced, placeholders, sentinels);
}

/**
 * Choose sentinel strings that are guaranteed not to appear in the
 * supplied source. The placeholders we splice into the masked source
 * have the form `<open><digits><close>`, so if a user-authored region
 * happened to contain that exact sequence the restore pass would
 * either swap in the wrong content or silently delete the match.
 *
 * Starting from the base PUA sentinels, we repeatedly append a copy of
 * each character until neither appears anywhere in `source`. The loop
 * is bounded by the source length, which is reached only in the
 * degenerate case where the input consists entirely of the base
 * sentinel character.
 */
function makeUniqueSentinels(source: string): { open: string; close: string } {
  let open = BASE_PLACEHOLDER_OPEN;
  let close = BASE_PLACEHOLDER_CLOSE;
  while (source.includes(open) || source.includes(close)) {
    open += BASE_PLACEHOLDER_OPEN;
    close += BASE_PLACEHOLDER_CLOSE;
  }
  return { open, close };
}

/**
 * Replace `[[iftags ...]]X[[/iftags]]` blocks innermost-first until no
 * iftags pair remains. The pattern is global, so each pass rewrites all
 * innermost blocks at once and thus eliminates one nesting level;
 * matched blocks become their body (if the condition holds) or the empty
 * string (otherwise).
 *
 * The loop terminates because every pass that changes the string removes
 * at least one nesting level. If the regex fails to match (no more
 * pairs, or unbalanced leftovers), the loop exits with the partially
 * reduced source.
 */
function reduceIftags(source: string, pageTags: string[]): string {
  let current = source;
  // Worst-case bound: one pass eliminates at least one nesting level, and
  // nesting depth is at most `source.length`. The explicit cap stops a
  // runaway regex (e.g. pathological zero-width match) from looping forever.
  const maxIterations = source.length + 1;
  for (let i = 0; i < maxIterations; i++) {
    const next = current.replace(INNERMOST_IFTAGS_PATTERN, (_, cond: string, body: string) => {
      const condition = parseTagCondition(cond);
      return evaluateTagCondition(condition, pageTags) ? body : "";
    });
    if (next === current) return current;
    current = next;
  }
  return current;
}

/**
 * Walk `source` and replace each raw region with a placeholder token
 * that downstream regex passes will not match against. The original
 * substrings are kept in `placeholders` so `restorePlaceholders` can
 * splice them back at the end.
 *
 * Raw regions handled:
 * - `[[code ...]]...[[/code]]` — consumes to EOF when the closing tag
 *   is missing, mirroring the block parser's behaviour for unclosed
 *   code blocks (it still collects content as raw and warns).
 * - `[[html ...]]...[[/html]]` — only masked when the closing tag is
 *   present. The block parser drops an unclosed `[[html]]` to literal
 *   text after warning, so preprocess must leave the body alone here
 *   too; otherwise an `[[iftags]]` further down the source would be
 *   incorrectly hidden behind the mask.
 * - `@<...>@` (single-line balanced raw — `>@` must be on the same line
 *   as the opening `@<`, mirroring the inline raw rule).
 * - `@@...@@` (single-line inline raw — must not span newlines).
 *
 * Genuinely unclosed `@@` / `@<` (no closing on the same line) are
 * left in place; the parser treats them as literal text anyway.
 *
 * Comments (`[!-- ... --]`) are deliberately NOT masked here. Wikidot's
 * legacy Text_Wiki runs the Iftags rule *before* the Comment rule (see
 * `lib/Text_Wiki/Text/Wiki.php`: Iftags at index 11, Comment at index 12),
 * so an `[[iftags]]` inside a comment is expanded first and then the
 * naive `[!--(.*?)--]` rule discards what's left. Masking comments here
 * would invert that order and produce different output.
 */
function maskRawRegions(
  source: string,
  sentinels: { open: string; close: string },
): { masked: string; placeholders: string[] } {
  const placeholders: string[] = [];
  let masked = "";
  let i = 0;

  while (i < source.length) {
    // [[code ...]] / [[html ...]]
    if (source[i] === "[" && source[i + 1] === "[") {
      RAW_BLOCK_OPEN_PATTERN.lastIndex = i;
      const openMatch = RAW_BLOCK_OPEN_PATTERN.exec(source);
      if (openMatch) {
        const name = openMatch[1]!.toLowerCase();
        const openLen = openMatch[0].length;
        // Find matching `[[/<name>]]` (case-insensitive, allows whitespace before name).
        // The `g` flag plus an explicit `lastIndex` searches forward from the
        // opener without slicing the source.
        const closePattern = new RegExp(`\\[\\[\\/\\s*${name}\\s*\\]\\]`, "ig");
        closePattern.lastIndex = i + openLen;
        const closeMatch = closePattern.exec(source);
        if (closeMatch) {
          const regionEnd = closeMatch.index + closeMatch[0].length;
          masked += pushPlaceholder(placeholders, source.slice(i, regionEnd), sentinels);
          i = regionEnd;
          continue;
        }
        // Unclosed: only `[[code]]` falls back to "consume to EOF" in
        // the parser; `[[html]]` is dropped to literal text. Mirror
        // that here so an unclosed `[[html]]` does not hide subsequent
        // `[[iftags]]` from preprocess.
        if (name === "code") {
          masked += pushPlaceholder(placeholders, source.slice(i), sentinels);
          i = source.length;
          continue;
        }
      }
    }

    // @<...>@ balanced raw — closing must appear before the next newline
    if (source[i] === "@" && source[i + 1] === "<") {
      const close = source.indexOf(">@", i + 2);
      const newline = source.indexOf("\n", i + 2);
      if (close !== -1 && (newline === -1 || close < newline)) {
        const regionEnd = close + 2;
        masked += pushPlaceholder(placeholders, source.slice(i, regionEnd), sentinels);
        i = regionEnd;
        continue;
      }
    }

    // @@...@@ inline raw (does not cross newlines)
    if (source[i] === "@" && source[i + 1] === "@") {
      const close = source.indexOf("@@", i + 2);
      const newline = source.indexOf("\n", i + 2);
      if (close !== -1 && (newline === -1 || close < newline)) {
        const regionEnd = close + 2;
        masked += pushPlaceholder(placeholders, source.slice(i, regionEnd), sentinels);
        i = regionEnd;
        continue;
      }
    }

    masked += source[i];
    i++;
  }

  return { masked, placeholders };
}

/** Append `text` to `placeholders` and return its sentinel-wrapped index. */
function pushPlaceholder(
  placeholders: string[],
  text: string,
  sentinels: { open: string; close: string },
): string {
  const idx = placeholders.length;
  placeholders.push(text);
  return `${sentinels.open}${idx}${sentinels.close}`;
}

/**
 * Escape a string for safe inclusion in a `RegExp` constructor.
 *
 * The sentinels are usually single Private Use Area characters, which
 * are already regex-safe, but the unique-sentinel fallback in
 * {@link makeUniqueSentinels} may extend them — escape defensively so
 * the function stays correct for any sentinel choice.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Inverse of {@link pushPlaceholder} across the entire reduced string. */
function restorePlaceholders(
  source: string,
  placeholders: string[],
  sentinels: { open: string; close: string },
): string {
  const pattern = new RegExp(
    `${escapeRegex(sentinels.open)}(\\d+)${escapeRegex(sentinels.close)}`,
    "g",
  );
  return source.replace(pattern, (_, idx: string) => placeholders[Number(idx)] ?? "");
}
