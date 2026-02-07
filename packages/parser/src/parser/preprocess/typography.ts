/**
 * @module preprocess/typography
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
 */

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
  let result = text;

  // Double quotes: ``...'' -> "..."
  result = result.replace(/``(.*?)''/g, `${LEFT_DOUBLE_QUOTE}$1${RIGHT_DOUBLE_QUOTE}`);

  // Low double quotes: ,,..'' -> „..."
  result = result.replace(/,,(.*?)''/g, `${LOW_DOUBLE_QUOTE}$1${RIGHT_DOUBLE_QUOTE}`);

  // Single quotes: `...' -> '...'
  result = result.replace(/`(.*?)'/g, `${LEFT_SINGLE_QUOTE}$1${RIGHT_SINGLE_QUOTE}`);

  // Ellipsis: ... or . . . -> …
  // Must be exactly 3 dots, not preceded or followed by more dots
  // Handle continuous dots: ...
  result = result.replace(/(?<![.])\.\.\.(?![.])/g, ELLIPSIS);

  // Handle spaced dots: . . .
  result = result.replace(/(?<![.])\. \. \.(?![.])/g, ELLIPSIS);

  return result;
}
