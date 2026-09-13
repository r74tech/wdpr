import { RE2JS } from "re2js";

export interface TextExcerptOptions {
  /** RE2 pattern, without / delimiters. Omit to truncate the entire text. */
  pattern?: string;
  /** Supported flags: i (case insensitive), m (line anchors), s (dot includes newline). */
  flags?: string;
  /** Capture number or name. Defaults to 0, the complete match. */
  group?: number | string;
  /** One-based, non-overlapping match number. Defaults to 1; maximum 10,000. */
  match?: number;
  /** Grapheme limit, default 200. Invalid, negative, or zero lengths return empty text. */
  maxLength?: number;
}

const segmenter = new Intl.Segmenter("und", { granularity: "grapheme" });
const emptyExcerpt = (_text: string): string => "";
const MAX_PATTERN_LENGTH = 4_096;
const MAX_INPUT_LENGTH = 1_000_000;
const MAX_PROGRAM_SIZE = 4_096;
const MAX_MATCHES = 10_000;
const SEARCH_BUDGET = 16_000_000;

/**
 * Compile once and reuse across pages. Invalid options, unsupported RE2 syntax, missing
 * matches/groups and exceeded limits return empty text. Regex inputs are limited to
 * 4,096 pattern code units and 1,000,000 text code units. The compiled program is limited
 * to 4,096 instructions; searches share a conservative 16,000,000-unit work budget
 * based on program size, capture count and remaining input length. No native RegExp fallback.
 */
export function compileTextExcerpt(options: TextExcerptOptions = {}): (text: string) => string {
  const limit = options.maxLength ?? 200;
  if (!Number.isSafeInteger(limit) || limit <= 0) return emptyExcerpt;
  if (options.pattern === undefined) {
    if (options.flags !== undefined || options.group !== undefined || options.match !== undefined) {
      return emptyExcerpt;
    }
    return (text) => truncateText(text, limit);
  }
  const occurrence = options.match ?? 1;
  const group = options.group ?? 0;
  if (
    options.pattern.length > MAX_PATTERN_LENGTH ||
    !Number.isSafeInteger(occurrence) ||
    occurrence < 1 ||
    occurrence > MAX_MATCHES ||
    (typeof group === "number" && (!Number.isSafeInteger(group) || group < 0))
  )
    return emptyExcerpt;
  let flags = 0;
  const seenFlags = new Set<string>();
  for (const flag of options.flags ?? "") {
    if (seenFlags.has(flag)) return emptyExcerpt;
    seenFlags.add(flag);
    switch (flag) {
      case "i":
        flags |= RE2JS.CASE_INSENSITIVE;
        break;
      case "m":
        flags |= RE2JS.MULTILINE;
        break;
      case "s":
        flags |= RE2JS.DOTALL;
        break;
      default:
        return emptyExcerpt;
    }
  }
  let compiled: RE2JS;
  try {
    compiled = RE2JS.compile(options.pattern, flags);
  } catch {
    return emptyExcerpt;
  }
  const programSize = compiled.programSize();
  const groupCount = compiled.groupCount();
  if (
    programSize > MAX_PROGRAM_SIZE ||
    (typeof group === "number" ? group > groupCount : !Object.hasOwn(compiled.namedGroups(), group))
  )
    return emptyExcerpt;

  return (text) => {
    if (text.length > MAX_INPUT_LENGTH) return "";
    const matcher = compiled.matcher(text);
    let budget = SEARCH_BUDGET;
    let from = 0;
    for (let index = 1; index <= occurrence; index++) {
      // Repeated unanchored searches can revisit the remaining input. Charge every search.
      budget -= programSize * (groupCount + 1) * (text.length - from + 1);
      if (budget < 0 || !matcher.find()) return "";
      from = matcher.end();
    }
    return truncateText(matcher.group(group) ?? "", limit);
  };
}

/** Select a regex match/capture and truncate without splitting a grapheme cluster. */
export function excerptText(text: string, options: TextExcerptOptions = {}): string {
  return compileTextExcerpt(options)(text);
}

function truncateText(text: string, limit: number): string {
  let count = 0;
  for (const segment of segmenter.segment(text)) {
    if (count++ === limit) return text.slice(0, segment.index);
  }
  return text;
}
