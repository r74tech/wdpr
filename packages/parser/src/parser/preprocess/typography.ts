/**
 *
 * Typographic preprocessing for Wikidot markup.
 *
 * Wikidot converts certain ASCII character sequences into their Unicode
 * typographic equivalents before parsing. This module handles the following
 * conversions:
 *
 * - ` `` ... '' ` becomes left/right double curly quotes (U+201C / U+201D)
 * - ` ,, ... '' ` becomes low-9 double quote + right double quote (U+201E / U+201D)
 * - `` ` ... ' `` becomes left/right single curly quotes (U+2018 / U+2019)
 * - `...` (three dots) and `. . .` (spaced dots) become an ellipsis (U+2026)
 *
 * Em dash conversion (`--` to U+2014) is intentionally NOT handled here.
 * It is performed in the parser instead, because the `--` sequence also appears
 * in HTML comment markers (`[!--` and `--]`), and converting it during
 * preprocessing would break comment detection.
 *
 * @module
 */

import { makeUniqueSentinels, maskRawRegions, restorePlaceholders } from "./utils";

/** Unicode left single quotation mark (U+2018) */
const LEFT_SINGLE_QUOTE = "\u2018"; // '
/** Unicode right single quotation mark (U+2019) */
const RIGHT_SINGLE_QUOTE = "\u2019"; // '
/** Unicode left double quotation mark (U+201C) */
const LEFT_DOUBLE_QUOTE = "\u201c"; // "
/** Unicode right double quotation mark (U+201D) */
const RIGHT_DOUBLE_QUOTE = "\u201d"; // "
/** Unicode double low-9 quotation mark (U+201E), used in German/Polish typography */
const LOW_DOUBLE_QUOTE = "\u201e"; // „
/** Unicode horizontal ellipsis (U+2026) */
const ELLIPSIS = "\u2026"; // …

function replaceExactEllipsisPattern(text: string, pattern: string): string {
  let searchFrom = 0;
  let result = "";
  let lastCopied = 0;
  const patternLength = pattern.length;

  while (searchFrom < text.length) {
    const index = text.indexOf(pattern, searchFrom);
    if (index === -1) break;

    const prev = index > 0 ? text[index - 1] : "";
    const next = index + patternLength < text.length ? text[index + patternLength] : "";
    if (prev !== "." && next !== ".") {
      result += text.slice(lastCopied, index) + ELLIPSIS;
      lastCopied = index + patternLength;
      searchFrom = lastCopied;
    } else {
      searchFrom = index + 1;
    }
  }

  return lastCopied === 0 ? text : result + text.slice(lastCopied);
}

function replaceDelimitedTypography(
  text: string,
  opener: string,
  closer: string,
  leftQuote: string,
  rightQuote: string,
): string {
  let searchFrom = 0;
  let result = "";
  let lastCopied = 0;
  let closeIndex = -1;
  let newlineIndex = -1;

  while (searchFrom < text.length) {
    const openIndex = text.indexOf(opener, searchFrom);
    if (openIndex === -1) break;

    const contentStart = openIndex + opener.length;
    if (closeIndex < contentStart) closeIndex = text.indexOf(closer, contentStart);
    if (closeIndex === -1) break;
    if (newlineIndex < contentStart) {
      const nextNewline = text.indexOf("\n", contentStart);
      newlineIndex = nextNewline === -1 ? text.length : nextNewline;
    }
    if (newlineIndex < closeIndex) {
      searchFrom = newlineIndex + 1;
      continue;
    }

    result += text.slice(lastCopied, openIndex);
    result += leftQuote;
    result += text.slice(contentStart, closeIndex);
    result += rightQuote;

    lastCopied = closeIndex + closer.length;
    searchFrom = lastCopied;
  }

  return lastCopied === 0 ? text : result + text.slice(lastCopied);
}

/**
 * Apply all typographic substitutions to the given text.
 *
 * Substitutions are applied in a specific order: double quotes first,
 * then low double quotes, then single quotes, then ellipsis. This order
 * matters because the backtick and apostrophe characters are shared
 * between single and double quote patterns.
 *
 * @param text - Text to transform
 * @returns Text with ASCII typography patterns replaced by Unicode equivalents
 */
export function substitute(text: string): string {
  if (
    !text.includes("`") &&
    !text.includes(",,") &&
    !text.includes("...") &&
    !text.includes(". . .")
  ) {
    return text;
  }
  const sentinels = makeUniqueSentinels(text);
  const { masked, placeholders } = maskRawRegions(text, sentinels);
  let result = masked;

  // Double quotes: ``...'' -> "..."
  if (result.includes("``") && result.includes("''")) {
    result = replaceDelimitedTypography(result, "``", "''", LEFT_DOUBLE_QUOTE, RIGHT_DOUBLE_QUOTE);
  }

  // Low double quotes: ,,..'' -> „..."
  if (result.includes(",,") && result.includes("''")) {
    result = replaceDelimitedTypography(result, ",,", "''", LOW_DOUBLE_QUOTE, RIGHT_DOUBLE_QUOTE);
  }

  // Single quotes: `...' -> '...'
  if (result.includes("`") && result.includes("'")) {
    result = replaceDelimitedTypography(result, "`", "'", LEFT_SINGLE_QUOTE, RIGHT_SINGLE_QUOTE);
  }

  // Ellipsis: ... or . . . -> …
  // Must be exactly 3 dots, not preceded or followed by more dots
  // Handle continuous dots: ...
  if (result.includes("...")) {
    result = replaceExactEllipsisPattern(result, "...");
  }

  // Handle spaced dots: . . .
  if (result.includes(". . .")) {
    result = replaceExactEllipsisPattern(result, ". . .");
  }

  return restorePlaceholders(result, placeholders, sentinels);
}
