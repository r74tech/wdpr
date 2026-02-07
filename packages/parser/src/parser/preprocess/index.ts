/**
 *
 * Preprocessing pipeline that transforms raw wikitext before tokenization.
 *
 * Wikidot applies two categories of text substitutions before the main parser
 * sees the input. This module orchestrates those substitutions in the correct
 * order: whitespace normalization first (to establish consistent line structure),
 * then typographic transformations (to convert ASCII quote/ellipsis patterns
 * into Unicode equivalents).
 *
 * The preprocessing step is essential because the lexer and parser assume
 * normalized input (Unix newlines, no tabs, consistent whitespace).
 *
 * @module
 */

import { substitute as whitespaceSubstitute } from "./whitespace";
import { substitute as typographySubstitute } from "./typography";

export { substitute as whitespace } from "./whitespace";
export { substitute as typography } from "./typography";

/**
 * Run the full preprocessing pipeline on raw wikitext.
 *
 * Applies the following transformations in order:
 * 1. Whitespace normalization (DOS/Mac newlines, tabs, leading spaces, etc.)
 * 2. Typographic substitutions (curly quotes, ellipsis)
 *
 * @param text - Raw wikitext input
 * @returns Preprocessed text ready for tokenization
 */
export function preprocess(text: string): string {
  let result = text;
  result = whitespaceSubstitute(result);
  result = typographySubstitute(result);
  return result;
}
