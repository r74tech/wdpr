/**
 *
 * Tokenizer and renderer for the Text_Highlighter-compatible syntax
 * highlighting engine. This is a faithful TypeScript port of the
 * PEAR Text_Highlighter 0.5.1 PHP library's `_getToken` algorithm and
 * HTML renderer.
 *
 * The engine processes source code through a state-machine-based tokenizer
 * that assigns CSS class names to each token, then renders the tokens as
 * `<span class="hl-*">` elements.
 *
 * @module
 */

import type { LanguageDefinition } from "./types";

/** A single highlighted token with its CSS class and text content. */
interface Token {
  /** CSS class name suffix (used as `hl-{class}`). */
  class: string;
  /** The literal text content of this token. */
  content: string;
}

/**
 * Tokenize source code using a language definition's state machine.
 *
 * This is a faithful port of PEAR Text_Highlighter's `_getToken` algorithm.
 * The key difference from PHP is that JavaScript lacks `PREG_OFFSET_CAPTURE`,
 * so capture group positions are computed from the match result.
 *
 * The input is preprocessed to normalize line endings, replace tabs with
 * spaces, and ensure empty lines have at least one space character
 * (matching PHP's behavior).
 *
 * @param def - The language definition describing the state machine.
 * @param input - Raw source code string to tokenize.
 * @returns Array of tokens, each with a CSS class and content string.
 */
export function tokenize(def: LanguageDefinition, input: string): Token[] {
  // Preprocess: same as PHP Html renderer's preprocess()
  let str = input.replace(/\r\n/g, "\n");
  // Replace empty lines with a space (PHP: preg_replace('~^$~m', " ", $str))
  str = str.replace(/^$/gm, " ");
  str = str.replace(/\t/g, "    ");
  // rtrim
  str = str.replace(/\s+$/, "");

  const len = str.length;
  if (len === 0) return [];

  let state = -1;
  let pos = 0;
  let lastinner = def.defClass;
  let lastdelim = def.defClass;
  let endpattern: RegExp | null = null;
  const stateStack: {
    state: number;
    lastdelim: string;
    lastinner: string;
    endpattern: RegExp | null;
  }[] = [];
  const tokenStack: Token[] = [];
  const result: Token[] = [];

  function getToken(): Token | null {
    if (tokenStack.length > 0) {
      return tokenStack.pop()!;
    }
    if (pos >= len) {
      return null;
    }

    // Check for end of current state
    let endpos = -1;
    let endmatch = "";
    if (state !== -1 && endpattern) {
      endpattern.lastIndex = pos;
      const em = endpattern.exec(str);
      if (em) {
        endpos = em.index;
        endmatch = em[0];
      }
    }

    // Try to match patterns for current state
    const reg = def.regs[state];
    if (reg) {
      reg.lastIndex = pos;
      const m = reg.exec(str);

      if (m) {
        // Find which pattern (alternative) matched by checking capture groups
        const countsArr = def.counts[state]!;
        const statesArr = def.states[state]!;
        const delimArr = def.delim[state]!;
        const innerArr = def.inner[state]!;
        let n = 1;
        for (let i = 0; i < countsArr.length; i++) {
          const count = countsArr[i]!;
          if (n >= m.length) break;

          // PHP: $m[$n][1] > -1 means the group captured something at a valid position
          // JS: m[n] != null means the group participated in the match (including empty string captures)
          if (m[n] != null && (endpos === -1 || m.index < endpos)) {
            const matchStart = m.index;
            const matchStr = m[n]!;

            // Find actual position of this specific group within the match
            // For alternation patterns, the matched group starts at m.index
            // because only one alternative matches at a time
            const groupStart = findGroupPosition(str, m, n, matchStart);

            if (statesArr[i] !== -1) {
              // State transition - push delimiter token
              tokenStack.push({ class: delimArr[i]!, content: matchStr });
            } else {
              // Non-transitioning match
              let inner = innerArr[i]!;

              // Check parts first
              const partDef = def.parts[state]?.[i];
              if (partDef) {
                const parts: Token[] = [];
                let partpos = groupStart;
                for (let j = 1; j <= count; j++) {
                  const subIdx = j + n;
                  if (subIdx >= m.length || m[subIdx] == null || m[subIdx] === "") continue;
                  const subStr = m[subIdx]!;
                  const subStart = str.indexOf(subStr, partpos);
                  if (subStart < 0) continue;
                  if (partDef[j]) {
                    if (subStart > partpos) {
                      parts.unshift({ class: inner, content: str.substring(partpos, subStart) });
                    }
                    parts.unshift({ class: partDef[j]!, content: subStr });
                  }
                  partpos = subStart + subStr.length;
                }
                if (partpos < groupStart + matchStr.length) {
                  parts.unshift({
                    class: inner,
                    content: str.substring(partpos, groupStart + matchStr.length),
                  });
                }
                tokenStack.push(...parts);
              } else {
                // Check keywords (fallback to state -1 if current state has no keyword def)
                let kwDef = def.keywords[state]?.[i];
                if (
                  !kwDef ||
                  kwDef === -1 ||
                  typeof kwDef !== "object" ||
                  Object.keys(kwDef).length === 0
                ) {
                  kwDef = def.keywords[-1]?.[i];
                }
                if (kwDef && kwDef !== -1 && typeof kwDef === "object") {
                  for (const [group, re] of Object.entries(kwDef)) {
                    if ((re as RegExp).test(matchStr)) {
                      inner = def.kwmap[group] ?? inner;
                      break;
                    }
                  }
                }
                tokenStack.push({ class: inner, content: matchStr });
              }
            }

            // Emit text before match (pushed after so it pops first)
            if (groupStart > pos) {
              tokenStack.push({ class: lastinner, content: str.substring(pos, groupStart) });
            }

            pos = groupStart + matchStr.length;

            // Handle state transition
            if (statesArr[i] !== -1) {
              stateStack.push({ state, lastdelim, lastinner, endpattern });
              lastinner = innerArr[i]!;
              lastdelim = delimArr[i]!;
              const prevState = state;
              state = statesArr[i]!;

              // Get end pattern for new state
              const endRe = def.end[state];

              // Handle substitution in end pattern (requires new RegExp)
              if (def.subst[prevState]?.[i] && endRe) {
                let epSource = endRe.source;
                for (let k = 0; k <= count; k++) {
                  const subIdx = n + k;
                  if (subIdx >= m.length || m[subIdx] == null) break;
                  const quoted = escapeRegex(m[subIdx]!);
                  epSource = epSource.replace(`%${k}%`, quoted);
                  epSource = epSource.replace(`%b${k}%`, matchingBrackets(quoted));
                }
                endpattern = new RegExp(epSource, endRe.flags);
              } else {
                // Reuse existing RegExp object (no substitution needed)
                endpattern = endRe ?? null;
              }
            }

            return tokenStack.pop()!;
          }
          n += count + 1;
        }
      }
    }

    // Handle end of state
    if (endpos > -1) {
      // Always push delimiter token (even for zero-width matches) to match PHP behavior
      tokenStack.push({ class: lastdelim, content: endmatch });
      if (endpos > pos) {
        tokenStack.push({ class: lastinner, content: str.substring(pos, endpos) });
      }
      const prev = stateStack.pop()!;
      state = prev.state;
      lastdelim = prev.lastdelim;
      lastinner = prev.lastinner;
      endpattern = prev.endpattern;
      pos = endpos + endmatch.length;
      if (tokenStack.length > 0) {
        return tokenStack.pop()!;
      }
      // Zero-width end pattern with no preceding content: continue to next token
      return getToken();
    }

    // No match - consume rest as default class
    const p = pos;
    pos = len;
    return { class: lastinner, content: str.substring(p) };
  }

  let token: Token | null;
  while ((token = getToken()) !== null) {
    result.push(token);
  }

  return result;
}

/**
 * Find the actual position of capture group `n` within the source string.
 *
 * For alternation patterns (`a|b|c`), the matched alternative starts at
 * the overall match position (`m.index`). This function locates the
 * capture group's substring within the source, searching from `matchStart`.
 *
 * @param str - The full source string.
 * @param m - The regex match result.
 * @param n - The capture group index.
 * @param matchStart - The starting position of the overall match.
 * @returns The position of the capture group within the source string.
 */
function findGroupPosition(str: string, m: RegExpExecArray, n: number, matchStart: number): number {
  // The overall match m[0] starts at m.index
  // The capture group m[n] is a substring of m[0]
  // Find where m[n] starts within the string, searching from matchStart
  const groupStr = m[n]!;
  const idx = str.indexOf(groupStr, matchStart);
  return idx >= 0 ? idx : matchStart;
}

/**
 * Render an array of tokens to HTML with `hl-*` class spans.
 *
 * This is a faithful port of Text_Highlighter's HTML renderer:
 * - Adjacent tokens with the same class are merged into a single `<span>`.
 * - All text is wrapped in spans (no unwrapped text nodes).
 * - The output is wrapped in `<div class="hl-main"><pre>...</pre></div>`.
 *
 * @param tokens - Array of tokens produced by {@link tokenize}.
 * @returns Complete HTML string for the highlighted code block.
 */
export function renderTokens(tokens: Token[]): string {
  if (tokens.length === 0) return "";

  let html = "";
  let lastClass = "";

  for (const token of tokens) {
    if (token.content.length === 0) continue;
    const escaped = escapeHtml(token.content);
    if (token.class !== lastClass) {
      if (lastClass) {
        html += "</span>";
      }
      html += `<span class="hl-${token.class}">`;
      lastClass = token.class;
    }
    html += escaped;
  }

  if (lastClass) {
    html += "</span>";
  }

  return `<div class="hl-main"><pre>${html}</pre></div>`;
}

/**
 * Escape HTML special characters for use inside highlighted code spans.
 *
 * @param str - Raw text to escape.
 * @returns HTML-safe string.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Escape regex special characters in a string for safe use in `new RegExp()`.
 *
 * @param str - Raw string to escape.
 * @returns Regex-safe string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Swap bracket characters to their matching counterparts.
 *
 * Used for end-pattern substitution where the closing delimiter is the
 * mirror of the opening delimiter (e.g., `<` becomes `>`).
 *
 * @param str - String containing bracket characters.
 * @returns String with each bracket replaced by its counterpart.
 */
function matchingBrackets(str: string): string {
  return str.replace(/[()<>[\]{}]/g, (c) => {
    const map: Record<string, string> = {
      "(": ")",
      ")": "(",
      "<": ">",
      ">": "<",
      "[": "]",
      "]": "[",
      "{": "}",
      "}": "{",
    };
    return map[c] ?? c;
  });
}
