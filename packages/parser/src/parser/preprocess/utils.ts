/**
 *
 * Shared helpers for text-level preprocess passes that run before
 * tokenization (e.g. `[[iftags]]` collapse, opener-embedded `[[#if]]`
 * collapse).
 *
 * Each pass needs to:
 * - mask raw regions (`[[code]]`, `[[html]]`, `@@..@@`, `@<..>@`) so a
 *   pattern they enclose is not transformed
 * - know the bracket-opener depth at every offset so it can distinguish
 *   directives at the top level from ones nested inside another block's
 *   opener attribute string
 *
 * The depth tracking mirrors the lexer's `blockOpenerDepth`:
 * - `[[` increments, `]]` decrements (clamped at 0)
 * - `[[[ ... ]]]` triple links do not affect block depth
 * - quoted attribute values (`= "..."`) are skipped to the next `"` /
 *   newline, matching the lexer's `QUOTED_STRING` recognition
 * - newlines reset depth to 0 (block openers are single-line constructs)
 *
 * @module
 */

const BASE_PLACEHOLDER_OPEN = "\uE000";
const BASE_PLACEHOLDER_CLOSE = "\uE001";

const RAW_BLOCK_OPEN_PATTERN = /\[\[\s*(code|html)\b[^\]]*\]\]/iy;

/** Unique sentinel characters used to wrap raw-region placeholders. */
export interface Sentinels {
  open: string;
  close: string;
}

/**
 * Choose sentinel strings that are guaranteed not to appear in `source`.
 * The placeholders we splice into the masked source have the form
 * `<open><digits><close>`, so the restore pass must not confuse them
 * with content. Extends both sentinel characters until neither appears.
 */
export function makeUniqueSentinels(source: string): Sentinels {
  let open = BASE_PLACEHOLDER_OPEN;
  let close = BASE_PLACEHOLDER_CLOSE;
  while (source.includes(open) || source.includes(close)) {
    open += BASE_PLACEHOLDER_OPEN;
    close += BASE_PLACEHOLDER_CLOSE;
  }
  return { open, close };
}

/**
 * Walk `source` and replace each raw region with a placeholder token so
 * downstream passes (regex / scan) do not transform their bodies. The
 * original substrings are kept in `placeholders` for {@link restorePlaceholders}
 * to splice back at the end.
 *
 * Raw regions handled:
 * - `[[code ...]]...[[/code]]` — consumes to EOF when the closing tag
 *   is missing (mirroring the block parser's behaviour for unclosed
 *   code blocks).
 * - `[[html ...]]...[[/html]]` — only masked when the closing tag is
 *   present; an unclosed `[[html]]` is left in place so a later directive
 *   is not incorrectly hidden behind the mask.
 * - `@<...>@` (single-line balanced raw — `>@` must be on the same line).
 * - `@@...@@` (single-line inline raw — must not span newlines).
 *
 * Genuinely unclosed `@@` / `@<` are left in place (the parser treats
 * them as literal text anyway). Comments `[!-- ... --]` are intentionally
 * not masked: Wikidot's legacy Text_Wiki evaluates `[[iftags]]` before
 * comments, so masking here would invert that order.
 */
export function maskRawRegions(
  source: string,
  sentinels: Sentinels,
): { masked: string; placeholders: string[] } {
  const placeholders: string[] = [];
  let masked = "";
  let i = 0;

  while (i < source.length) {
    if (source[i] === "[" && source[i + 1] === "[") {
      RAW_BLOCK_OPEN_PATTERN.lastIndex = i;
      const openMatch = RAW_BLOCK_OPEN_PATTERN.exec(source);
      if (openMatch) {
        const name = openMatch[1]!.toLowerCase();
        const openLen = openMatch[0].length;
        const closePattern = new RegExp(`\\[\\[\\/\\s*${name}\\s*\\]\\]`, "ig");
        closePattern.lastIndex = i + openLen;
        const closeMatch = closePattern.exec(source);
        if (closeMatch) {
          const regionEnd = closeMatch.index + closeMatch[0].length;
          masked += pushPlaceholder(placeholders, source.slice(i, regionEnd), sentinels);
          i = regionEnd;
          continue;
        }
        if (name === "code") {
          masked += pushPlaceholder(placeholders, source.slice(i), sentinels);
          i = source.length;
          continue;
        }
      }
    }

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

function pushPlaceholder(placeholders: string[], text: string, sentinels: Sentinels): string {
  const idx = placeholders.length;
  placeholders.push(text);
  return `${sentinels.open}${idx}${sentinels.close}`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Inverse of {@link maskRawRegions}: replace placeholders with originals. */
export function restorePlaceholders(
  source: string,
  placeholders: string[],
  sentinels: Sentinels,
): string {
  const pattern = new RegExp(
    `${escapeRegex(sentinels.open)}(\\d+)${escapeRegex(sentinels.close)}`,
    "g",
  );
  return source.replace(pattern, (_, idx: string) => placeholders[Number(idx)] ?? "");
}

/**
 * Compute the unmatched-`[[` depth at each character offset of `source`.
 * Mirrors the lexer's `blockOpenerDepth`. Returns `Int32Array` of length
 * `source.length + 1`; `depths[k]` is the depth immediately before the
 * character at offset `k` is consumed.
 */
export function computeBracketDepths(source: string): Int32Array {
  const n = source.length;
  const depths = new Int32Array(n + 1);
  let depth = 0;
  let i = 0;
  while (i < n) {
    depths[i] = depth;
    const c = source.charCodeAt(i);
    const c1 = i + 1 < n ? source.charCodeAt(i + 1) : -1;
    const c2 = i + 2 < n ? source.charCodeAt(i + 2) : -1;

    if (depth > 0 && c === 0x22 /* " */ && precededByEqualsAttr(source, i)) {
      const end = findQuoteEnd(source, i + 1);
      for (let k = i; k <= end; k++) depths[k] = depth;
      i = end + 1;
      continue;
    }

    if (c === 0x5b /* [ */ && c1 === 0x5b && c2 === 0x5b) {
      const end = findTripleLinkEnd(source, i + 3);
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
      // Block openers are single-line; reset depth at line boundaries so
      // an unterminated `[[xxx` does not keep subsequent directives
      // inside its (imaginary) opener context.
      depth = 0;
    }

    i++;
  }
  depths[n] = depth;
  return depths;
}

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

function findQuoteEnd(s: string, from: number): number {
  for (let i = from; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    if (ch === 0x22 /* " */ || ch === 0x0a /* \n */) return i;
  }
  return s.length - 1;
}

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
