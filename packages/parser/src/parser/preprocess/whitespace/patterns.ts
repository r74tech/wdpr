/**
 * Matches non-standard whitespace characters (non-breaking space U+00A0,
 * figure space U+2007) at the start of lines.
 */
export const LEADING_NONSTANDARD_WHITESPACE: RegExp = /^[\u00a0\u2007]+/gm;

/** Matches lines containing only whitespace (collapsed to empty lines). */
export const WHITESPACE_ONLY_LINE: RegExp = /^\s+$/gm;

/** Matches DOS (`\r\n`) and legacy Mac (`\r`) line endings. */
export const DOS_MAC_NEWLINES: RegExp = /\r\n?/g;

/**
 * Matches a backslash immediately followed by a newline.
 * In Wikidot, `\` at end of line acts as an explicit line break (`<br />`).
 */
export const CONCAT_LINES: RegExp = /\\\n/g;

/** Matches tab characters (expanded to four spaces). */
export const TABS: RegExp = /\t/g;

/** Matches null (NUL) characters (replaced with spaces). */
export const NULL_CHARS: RegExp = new RegExp(String.fromCharCode(0), "g");
