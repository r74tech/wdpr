/**
 * Whitespace preprocessing
 *
 * Performs whitespace substitutions:
 * - Replace DOS/Mac newlines with Unix newlines
 * - Replace leading non-standard whitespace (nbsp, figure space) with regular spaces
 * - Strip lines with only whitespace
 * - Concatenate lines ending with backslash
 * - Convert tabs to four spaces
 * - Convert null characters to regular spaces
 * - Remove leading and trailing newlines
 */

// Non-standard whitespace characters at line start (nbsp, figure space)
const LEADING_NONSTANDARD_WHITESPACE = /^[\u00a0\u2007]+/gm;

// Lines containing only whitespace
const WHITESPACE_ONLY_LINE = /^\s+$/gm;

// Leading newlines at start of text
const LEADING_NEWLINES = /^\n+/;

// Trailing newlines at end of text
const TRAILING_NEWLINES = /\n+$/;

// DOS (\r\n) and legacy Mac (\r) newlines
const DOS_MAC_NEWLINES = /\r\n?/g;

// Backslash at end of line (concatenate lines)
const CONCAT_LINES = /\\\n/g;

// Tab characters
const TABS = /\t/g;

// Null characters
const NULL_CHARS = /\0/g;

/**
 * Replace leading non-standard whitespace with regular spaces
 */
function replaceLeadingSpaces(text: string): string {
  return text.replace(LEADING_NONSTANDARD_WHITESPACE, (match) => {
    return " ".repeat(match.length);
  });
}

/**
 * Performs all whitespace substitutions on the given text
 */
export function substitute(text: string): string {
  let result = text;

  // Replace DOS and Mac newlines
  result = result.replace(DOS_MAC_NEWLINES, "\n");

  // Replace leading non-standard spaces with regular spaces
  result = replaceLeadingSpaces(result);

  // Strip lines with only whitespace
  result = result.replace(WHITESPACE_ONLY_LINE, "");

  // Backslash at end of line → line break marker (U+E000)
  // Wikidot treats \ at end of line as <br />
  result = result.replace(CONCAT_LINES, String.fromCharCode(0xe000));

  // Tabs to spaces
  result = result.replace(TABS, "    ");

  // Null characters to spaces
  result = result.replace(NULL_CHARS, " ");

  // Remove leading and trailing newlines
  result = result.replace(LEADING_NEWLINES, "");
  result = result.replace(TRAILING_NEWLINES, "");

  return result;
}
