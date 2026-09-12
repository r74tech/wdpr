/**
 *
 * Whitespace normalization preprocessing for Wikidot markup.
 *
 * This module ensures the lexer and parser receive input with consistent
 * whitespace conventions. It handles platform differences (DOS/Mac newlines),
 * normalizes exotic whitespace characters that users may paste from external
 * sources, and applies Wikidot-specific behaviors like backslash line continuation.
 *
 * @module
 */

import { needsWhitespaceSubstitution, mayContainWhitespaceOnlyLine } from "./detection";
import { replaceLeadingSpaces } from "./leading-spaces";
import { CONCAT_LINES, DOS_MAC_NEWLINES, NULL_CHARS, TABS, WHITESPACE_ONLY_LINE } from "./patterns";
import { makeUniqueSentinels, maskRawRegions, restorePlaceholders } from "../utils";

/**
 * Apply all whitespace normalization substitutions to the given text.
 *
 * Substitutions are applied in a specific order that avoids interference
 * between steps (e.g., DOS newlines must be normalized before backslash
 * continuation can be detected).
 */
export function substitute(text: string): string {
  if (!needsWhitespaceSubstitution(text)) {
    return text;
  }

  let result = text;

  if (result.indexOf("\r") !== -1) {
    result = result.replace(DOS_MAC_NEWLINES, "\n");
  }

  if (result.indexOf("\u00a0") !== -1 || result.indexOf("\u2007") !== -1) {
    result = replaceLeadingSpaces(result);
  }

  if (mayContainWhitespaceOnlyLine(result)) {
    result = result.replace(WHITESPACE_ONLY_LINE, "");
  }

  if (result.indexOf("\\\n") !== -1) {
    const sentinels = makeUniqueSentinels(result);
    const { masked, placeholders } = maskRawRegions(result, sentinels);
    result = restorePlaceholders(
      masked.replace(CONCAT_LINES, String.fromCharCode(0xe000)),
      placeholders,
      sentinels,
    );
  }

  if (result.indexOf("\t") !== -1) {
    result = result.replace(TABS, "    ");
  }

  if (result.indexOf("\0") !== -1) {
    result = result.replace(NULL_CHARS, " ");
  }

  if (result[0] === "\n") {
    result = trimLeadingNewlines(result);
  }
  if (result[result.length - 1] === "\n") {
    result = trimTrailingNewlines(result);
  }

  return result;
}

function trimLeadingNewlines(text: string): string {
  let index = 0;
  while (text[index] === "\n") {
    index++;
  }
  return index === 0 ? text : text.slice(index);
}

function trimTrailingNewlines(text: string): string {
  let end = text.length;
  while (end > 0 && text[end - 1] === "\n") {
    end--;
  }
  return end === text.length ? text : text.slice(0, end);
}
