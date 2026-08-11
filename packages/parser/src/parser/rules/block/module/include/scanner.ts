/**
 * Matches the opening `[[include` token at the start of a line.
 *
 * The `m` flag makes `^` match at line boundaries, enforcing the Wikidot
 * rule that `[[include]]` must appear at the start of a line. The trailing
 * `\s` separates the directive name from its arguments. The actual extent
 * of each directive is found by scanIncludeDirectives, which balances nested
 * `[[ ... ]]` so that block markup inside a parameter value does not terminate
 * the directive at the first `]]`.
 */
const INCLUDE_OPEN_PATTERN = /^\[\[include\s/gim;
const OPEN_BRACKET = 91;
const CLOSE_BRACKET = 93;

/** A located `[[include ...]]` directive with bracket-balanced extent. */
export interface IncludeDirectiveMatch {
  /** Index of the opening `[[`. */
  start: number;
  /** Index just past the closing `]]`. */
  end: number;
  /** Text between `[[include ` and the closing `]]`. */
  inner: string;
}

/**
 * Find all `[[include ...]]` directives in `source`, choosing each
 * closing `]]` so that block markup inside a parameter value does not
 * end the directive prematurely.
 */
export function scanIncludeDirectives(source: string): IncludeDirectiveMatch[] {
  const matches: IncludeDirectiveMatch[] = [];
  const opener = INCLUDE_OPEN_PATTERN;
  opener.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = opener.exec(source)) !== null) {
    const start = match.index;
    const contentStart = start + match[0].length;
    const firstNewline = source.indexOf("\n", start);

    let depth = 0;
    let linkDepth = 0;
    const nestedQuotes: Array<number | null> = [];
    const nestedQuoteAllowed: boolean[] = [];
    let i = start;
    let closeEnd = -1;

    while (i < source.length) {
      const ch = source.charCodeAt(i);
      const next = source.charCodeAt(i + 1);
      const nextNext = source.charCodeAt(i + 2);

      if (ch === 10 || ch === 13) {
        linkDepth = 0;
        if (depth > 1) {
          depth = 1;
          nestedQuotes.length = 0;
          nestedQuoteAllowed.length = 0;
        }
        i++;
        continue;
      }

      const nestedQuote = nestedQuotes.at(-1);
      if (nestedQuote !== undefined && nestedQuote !== null) {
        if (ch === 92) {
          i += 2;
        } else {
          if (ch === nestedQuote) {
            nestedQuotes[nestedQuotes.length - 1] = null;
            nestedQuoteAllowed[nestedQuoteAllowed.length - 1] = false;
          }
          i++;
        }
      } else if (
        nestedQuote === null &&
        nestedQuoteAllowed.at(-1) === true &&
        (ch === 34 || ch === 39)
      ) {
        nestedQuotes[nestedQuotes.length - 1] = ch;
        nestedQuoteAllowed[nestedQuoteAllowed.length - 1] = false;
        i++;
      } else if (ch === OPEN_BRACKET && next === OPEN_BRACKET && nextNext === OPEN_BRACKET) {
        linkDepth++;
        i += 3;
      } else if (
        linkDepth > 0 &&
        ch === CLOSE_BRACKET &&
        next === CLOSE_BRACKET &&
        nextNext === CLOSE_BRACKET
      ) {
        linkDepth--;
        i += 3;
      } else if (linkDepth > 0) {
        i++;
      } else if (ch === OPEN_BRACKET && next === OPEN_BRACKET) {
        if (nestedQuoteAllowed.length > 0) {
          nestedQuoteAllowed[nestedQuoteAllowed.length - 1] = false;
        }
        if (depth > 0) {
          nestedQuotes.push(null);
          nestedQuoteAllowed.push(false);
        }
        depth++;
        i += 2;
      } else if (ch === CLOSE_BRACKET && next !== CLOSE_BRACKET && depth > 1) {
        // A lone `]` is the first close of an intentionally incomplete nested
        // token (for example `[[module ...]` passed through an include value).
        depth--;
        nestedQuotes.pop();
        nestedQuoteAllowed.pop();
        i++;
      } else if (ch === CLOSE_BRACKET && next === CLOSE_BRACKET) {
        const closeStart = i;
        if (depth > 1) {
          nestedQuotes.pop();
          nestedQuoteAllowed.pop();
        }
        depth--;
        i += 2;

        if (depth <= 0) {
          const innerSoFar = source.slice(contentStart, closeStart);
          if (hasAttributes(innerSoFar)) {
            while (i < source.length && source[i] === "]") {
              i++;
            }
          }
          const onOpenerLine = firstNewline === -1 || closeStart < firstNewline;
          if (onOpenerLine || isRestOfLineBlank(source, i)) {
            closeEnd = i;
            break;
          }
        }
      } else {
        if (nestedQuoteAllowed.length > 0) {
          if (ch === 61) {
            nestedQuoteAllowed[nestedQuoteAllowed.length - 1] = true;
          } else if (ch !== 32 && ch !== 9) {
            nestedQuoteAllowed[nestedQuoteAllowed.length - 1] = false;
          }
        }
        i++;
      }
    }

    if (closeEnd === -1) {
      opener.lastIndex = start + 2;
      continue;
    }

    matches.push({ start, end: closeEnd, inner: source.slice(contentStart, closeEnd - 2) });
    opener.lastIndex = closeEnd;
  }

  return matches;
}

/**
 * Returns true when the directive's inner content carries an attribute section,
 * either pipe-delimited (`|key=value`) or space-separated after the page name.
 */
function hasAttributes(innerSoFar: string): boolean {
  if (innerSoFar.includes("|")) return true;
  const trimmed = innerSoFar.trimStart();
  const whitespaceIndex = trimmed.search(/\s/);
  if (whitespaceIndex === -1) return false;
  return trimmed.slice(whitespaceIndex).trim().length > 0;
}

function isRestOfLineBlank(source: string, pos: number): boolean {
  for (let i = pos; i < source.length; i++) {
    const ch = source[i];
    if (ch === "\n") return true;
    if (ch !== " " && ch !== "\t" && ch !== "\r") return false;
  }
  return true;
}
