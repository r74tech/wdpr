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

/**
 * Compute the unmatched-`[[` depth at each character offset of `masked`.
 *
 * Approximates the lexer's `blockOpenerDepth` (see `lexer.ts`):
 * - `[[` increments, `]]` decrements (clamped at 0).
 * - `[[[ ... ]]]` triple-bracket links are LINK_OPEN/LINK_CLOSE in the
 *   lexer and do **not** participate in block-opener depth — skipped
 *   here so that an `[[iftags]]` inside a link text is not misclassified
 *   as opener-embedded.
 * - Inside an opener context (`depth > 0`) a `"` preceded by `=` (with
 *   only whitespace in between) opens a quoted attribute value; its
 *   contents are skipped until the next `"` or `\n`, mirroring
 *   `lexer.ts` `QUOTED_STRING` recognition. This protects opener-internal
 *   `]]` inside attribute strings from being counted as block closers.
 *
 * The returned array has length `masked.length + 1` and `depths[k]`
 * represents the depth **immediately before** the character at offset
 * `k` is consumed. `INNERMOST_IFTAGS_PATTERN` returns offsets at the
 * leading `[` of `[[iftags`, so `depths[offset]` is the depth of the
 * surrounding context.
 */
function computeBracketDepths(masked: string): Int32Array {
  const n = masked.length;
  const depths = new Int32Array(n + 1);
  let depth = 0;
  let i = 0;
  while (i < n) {
    depths[i] = depth;
    const c = masked.charCodeAt(i);
    const c1 = i + 1 < n ? masked.charCodeAt(i + 1) : -1;
    const c2 = i + 2 < n ? masked.charCodeAt(i + 2) : -1;

    // Quoted attribute value inside an opener context.
    if (depth > 0 && c === 0x22 /* " */ && precededByEqualsAttr(masked, i)) {
      const end = findQuoteEnd(masked, i + 1);
      for (let k = i; k <= end; k++) depths[k] = depth;
      i = end + 1;
      continue;
    }

    // Triple-bracket link: [[[ ... ]]] does not change opener depth.
    if (c === 0x5b /* [ */ && c1 === 0x5b && c2 === 0x5b) {
      const end = findTripleLinkEnd(masked, i + 3);
      for (let k = i; k <= end; k++) depths[k] = depth;
      i = end + 1;
      continue;
    }

    if (c === 0x5b && c1 === 0x5b) {
      depth++;
      depths[i + 1] = depth;
      i += 2;
      continue;
    }

    if (c === 0x5d /* ] */ && c1 === 0x5d) {
      depth = Math.max(0, depth - 1);
      depths[i + 1] = depth;
      i += 2;
      continue;
    }

    if (c === 0x0a /* \n */) {
      // Reset depth at line boundaries: Wikidot block openers are
      // single-line constructs, so an unterminated `[[xxx` that spills
      // past a newline should not keep subsequent block-level iftags
      // inside its (imaginary) opener context. Without this reset,
      // `[[broken\n[[iftags +foo]]body[[/iftags]]` would misclassify
      // the iftags as opener-embedded and collapse it instead of
      // deferring evaluation to the AST resolver.
      depth = 0;
    }

    i++;
  }
  depths[n] = depth;
  return depths;
}

/**
 * Return `true` when position `i` of `s` is preceded (after skipping
 * spaces/tabs) by a literal `=` character — the lexer's condition for
 * promoting a following `"` to a `QUOTED_STRING` token. Newlines are
 * treated as non-equals so an unterminated `=` on a previous line does
 * not arm quote recognition for arbitrary `"` later on.
 */
function precededByEqualsAttr(s: string, i: number): boolean {
  let j = i - 1;
  while (j >= 0) {
    const ch = s.charCodeAt(j);
    if (ch === 0x20 /* space */ || ch === 0x09 /* tab */) {
      j--;
      continue;
    }
    return ch === 0x3d; /* = */
  }
  return false;
}

/**
 * Find the offset of the closing `"` (or terminating `\n`) for a quoted
 * attribute value that opens at `from`. Returns the offset of the
 * terminator. Mirrors the lexer's behaviour of stopping at newline.
 */
function findQuoteEnd(s: string, from: number): number {
  for (let i = from; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    if (ch === 0x22 /* " */ || ch === 0x0a /* \n */) return i;
  }
  return s.length - 1;
}

/**
 * Find the end offset of a `[[[ ... ]]]` triple-bracket link starting
 * at `from` (the position immediately after the opening `[[[`).
 *
 * Conservative termination: stops at the first `]]]`, at a blank line
 * (two consecutive `\n`), or at EOF. Wikidot's link parser also bails
 * out on multi-line link bodies, so a `[[[` with no matching `]]]`
 * inside a paragraph is treated as a one-paragraph region for depth
 * purposes. The exact semantics of inner content do not matter here —
 * we only need to ensure block-opener depth is not inflated by `[[` /
 * `]]` that the lexer would never see as block markers.
 */
function findTripleLinkEnd(s: string, from: number): number {
  for (let i = from; i < s.length; i++) {
    if (
      s.charCodeAt(i) === 0x5d &&
      i + 2 < s.length &&
      s.charCodeAt(i + 1) === 0x5d &&
      s.charCodeAt(i + 2) === 0x5d
    ) {
      return i + 2;
    }
    if (s.charCodeAt(i) === 0x0a && i + 1 < s.length && s.charCodeAt(i + 1) === 0x0a) {
      return i;
    }
  }
  return s.length - 1;
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
