/**
 * Preprocessing module
 *
 * Performs text substitutions before tokenization:
 * - Whitespace normalization (newlines, tabs, etc.)
 * - Typography transformations (quotes, ellipsis)
 */

import { substitute as whitespaceSubstitute } from "./whitespace";
import { substitute as typographySubstitute } from "./typography";

export { substitute as whitespace } from "./whitespace";
export { substitute as typography } from "./typography";

/**
 * Run the preprocessor on the given wikitext
 *
 * The following modifications are performed:
 * - Replacing DOS and legacy Mac newlines
 * - Trimming whitespace lines
 * - Concatenating lines that end with backslashes
 * - Convert tabs to four spaces
 * - Wikidot typography transformations
 */
export function preprocess(text: string): string {
  let result = text;
  result = whitespaceSubstitute(result);
  result = typographySubstitute(result);
  return result;
}
