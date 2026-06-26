/**
 * Find the actual position of capture group `n` within the source string.
 */
export function findGroupPosition(
  str: string,
  match: RegExpExecArray,
  groupIndex: number,
  matchStart: number,
): number {
  const groupStr = match[groupIndex]!;
  const idx = str.indexOf(groupStr, matchStart);
  return idx >= 0 ? idx : matchStart;
}

/**
 * Escape regex special characters in a string for safe use in `new RegExp()`.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Swap bracket characters to their matching counterparts.
 */
export function matchingBrackets(str: string): string {
  return str.replace(/[()<>[\]{}]/g, (char) => MATCHING_BRACKETS[char] ?? char);
}

const MATCHING_BRACKETS: Record<string, string> = {
  "(": ")",
  ")": "(",
  "<": ">",
  ">": "<",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
};
