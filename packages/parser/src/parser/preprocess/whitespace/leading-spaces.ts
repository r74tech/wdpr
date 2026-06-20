import { LEADING_NONSTANDARD_WHITESPACE } from "./patterns";

/**
 * Replace non-standard whitespace characters at the start of each line
 * with the same number of regular ASCII spaces.
 */
export function replaceLeadingSpaces(text: string): string {
  return text.replace(LEADING_NONSTANDARD_WHITESPACE, (match) => {
    return " ".repeat(match.length);
  });
}
