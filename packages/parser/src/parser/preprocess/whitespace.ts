/**
 *
 * Whitespace normalization preprocessing for Wikidot markup.
 *
 * This module ensures the lexer and parser receive input with consistent
 * whitespace conventions. It handles platform differences (DOS/Mac newlines),
 * normalizes exotic whitespace characters that users may paste from external
 * sources, and applies Wikidot-specific behaviors like backslash line continuation.
 *
 * Substitutions are applied in a deliberate order:
 * 1. Newline normalization (DOS `\r\n` and legacy Mac `\r` to Unix `\n`)
 * 2. Non-standard leading whitespace replacement (nbsp, figure space to regular space)
 * 3. Whitespace-only line stripping (collapse to empty lines)
 * 4. Backslash line continuation (`\\\n` to line-break marker U+E000)
 * 5. Tab expansion (tab to four spaces)
 * 6. Null character replacement (NUL to space)
 * 7. Leading/trailing newline removal
 *
 * @module
 */

/**
 * Matches non-standard whitespace characters (non-breaking space U+00A0,
 * figure space U+2007) at the start of lines. These are replaced with
 * regular ASCII spaces so the parser's indentation logic works correctly.
 */
const LEADING_NONSTANDARD_WHITESPACE = /^[\u00a0\u2007]+/gm;

/** Matches lines containing only whitespace (collapsed to empty lines). */
const WHITESPACE_ONLY_LINE = /^\s+$/gm;

/** Matches one or more newlines at the very start of the text. */
const LEADING_NEWLINES = /^\n+/;

/** Matches one or more newlines at the very end of the text. */
const TRAILING_NEWLINES = /\n+$/;

/** Matches DOS (`\r\n`) and legacy Mac (`\r`) line endings. */
const DOS_MAC_NEWLINES = /\r\n?/g;

/**
 * Matches a backslash immediately followed by a newline.
 * In Wikidot, `\` at end of line acts as an explicit line break (`<br />`).
 */
const CONCAT_LINES = /\\\n/g;

/** Matches tab characters (expanded to four spaces). */
const TABS = /\t/g;

/** Matches null (NUL) characters (replaced with spaces). */
const NULL_CHARS = /\0/g;

/**
 * Replace non-standard whitespace characters at the start of each line
 * with the same number of regular ASCII spaces.
 *
 * This ensures indentation-sensitive constructs (like nested lists) work
 * correctly regardless of whether the user typed regular spaces, non-breaking
 * spaces, or figure spaces.
 *
 * @param text - Input text with potentially non-standard leading whitespace
 * @returns Text with leading non-standard whitespace replaced by ASCII spaces
 */
function replaceLeadingSpaces(text: string): string {
  return text.replace(LEADING_NONSTANDARD_WHITESPACE, (match) => {
    return " ".repeat(match.length);
  });
}

/**
 * Apply all whitespace normalization substitutions to the given text.
 *
 * Substitutions are applied in a specific order that avoids interference
 * between steps (e.g., DOS newlines must be normalized before backslash
 * continuation can be detected).
 *
 * The backslash continuation step converts `\\\n` to the Private Use Area
 * character U+E000, which the lexer later recognizes as an explicit line break.
 * This approach avoids ambiguity with other uses of the backslash character.
 *
 * @param text - Raw input text
 * @returns Text with normalized whitespace, ready for typography preprocessing
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
