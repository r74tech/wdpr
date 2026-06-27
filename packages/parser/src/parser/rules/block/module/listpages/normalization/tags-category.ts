import type { NormalizedCategory, NormalizedTags } from "../types";

/**
 * Pattern for splitting multi-value attribute strings.
 * Wikidot allows commas, semicolons, and whitespace as separators between values.
 */
const TOKEN_SEPARATOR = /[,;\s]+/;

/**
 * Parse tags string into structured format.
 */
export function parseTags(value: string): NormalizedTags {
  const result: NormalizedTags = {
    all: [],
    any: [],
    none: [],
    special: null,
  };

  const trimmed = value.trim();
  if (!trimmed) return result;

  if (trimmed === "-") {
    result.special = "none";
    return result;
  }
  if (trimmed === "==") {
    result.special = "same-all";
    return result;
  }

  const tokens = trimmed.split(TOKEN_SEPARATOR).filter(Boolean);

  for (const token of tokens) {
    if (token === "=") {
      result.special = "same-visible";
    } else if (token.startsWith("+")) {
      const tag = token.slice(1);
      if (tag) result.all.push(tag);
    } else if (token.startsWith("-")) {
      const tag = token.slice(1);
      if (tag) result.none.push(tag);
    } else {
      result.any.push(token);
    }
  }

  return result;
}

/**
 * Parse category string into structured format.
 */
export function parseCategory(value: string): NormalizedCategory {
  const result: NormalizedCategory = {
    include: [],
    exclude: [],
    all: false,
    current: false,
  };

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return result;

  if (trimmed === "*") {
    result.all = true;
    return result;
  }

  const tokens = trimmed.split(TOKEN_SEPARATOR).filter(Boolean);

  for (const token of tokens) {
    if (token === "*") {
      result.all = true;
    } else if (token === ".") {
      result.current = true;
    } else if (token.startsWith("-")) {
      const cat = token.slice(1);
      if (cat) result.exclude.push(cat);
    } else {
      result.include.push(token);
    }
  }

  return result;
}
