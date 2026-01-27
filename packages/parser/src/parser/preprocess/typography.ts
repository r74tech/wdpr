/**
 * Typography preprocessing
 *
 * Performs Wikidot's typographical modifications:
 * - `` .. '' to fancy double quotes ("...")
 * - ` .. ' to fancy single quotes ('...')
 * - ,, .. '' to fancy lowered double quotes („...")
 * - ... to an ellipsis (…)
 *
 * Em dash conversion is handled in the parser to prevent
 * converting `--` in `[!--` and `--]` comment markers.
 */

// Unicode quote characters
const LEFT_SINGLE_QUOTE = "\u2018"; // '
const RIGHT_SINGLE_QUOTE = "\u2019"; // '
const LEFT_DOUBLE_QUOTE = "\u201c"; // "
const RIGHT_DOUBLE_QUOTE = "\u201d"; // "
const LOW_DOUBLE_QUOTE = "\u201e"; // „
const ELLIPSIS = "\u2026"; // …

/**
 * Performs all typographic substitutions on the given text
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
