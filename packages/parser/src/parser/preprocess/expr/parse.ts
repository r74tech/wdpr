import { isWhitespace } from "./chars";
import { matchDirectiveKind } from "./kind";
import type { DirectiveKind, DirectiveMatch } from "./types";

/**
 * Try to parse a single `[[#kind ...]]` directive starting at `start`.
 * Returns `null` when the directive is malformed (no closing `]]`) or
 * when its body contains another `[[#kind]]` of the same family
 * (so the caller should keep descending). The substrings are returned
 * raw; callers decide how to evaluate them.
 */
export function tryParseInnermostDirective(
  source: string,
  start: number,
  kind: DirectiveKind,
): DirectiveMatch | null {
  const keywordLen = kind === "ifexpr" ? 6 : kind === "expr" ? 4 : 2;
  let pos = start + 3 + keywordLen;
  while (pos < source.length && isWhitespace(source[pos])) pos++;

  const headStart = pos;
  let blockDepth = 0;
  let linkDepth = 0;
  const pipes: number[] = [];
  let closeStart = -1;

  while (pos < source.length) {
    if (matchDirectiveKind(source, pos) !== null) {
      return null;
    }
    if (source.startsWith("[[[", pos)) {
      linkDepth++;
      pos += 3;
      continue;
    }
    if (linkDepth > 0 && source.startsWith("]]]", pos)) {
      linkDepth--;
      pos += 3;
      continue;
    }
    if (linkDepth > 0) {
      pos++;
      continue;
    }
    if (source.startsWith("[[", pos)) {
      blockDepth++;
      pos += 2;
      continue;
    }
    if (source.startsWith("]]", pos)) {
      if (blockDepth === 0) {
        closeStart = pos;
        break;
      }
      blockDepth--;
      pos += 2;
      continue;
    }
    if (source[pos] === "|" && blockDepth === 0 && linkDepth === 0) {
      pipes.push(pos);
    }
    pos++;
  }

  if (closeStart === -1) return null;
  const hasPipe = pipes.length > 0;
  if (!hasPipe && (kind === "if" || kind === "ifexpr")) return null;

  return buildDirectiveMatch(source, headStart, closeStart, pipes, hasPipe);
}

function buildDirectiveMatch(
  source: string,
  headStart: number,
  closeStart: number,
  pipes: number[],
  hasPipe: boolean,
): DirectiveMatch {
  if (!hasPipe) {
    return {
      end: closeStart + 2,
      head: source.slice(headStart, closeStart).trim(),
      thenText: "",
      elseText: "",
      hasPipe,
    };
  }

  const head = source.slice(headStart, pipes[0]!).trim();
  const thenText =
    pipes.length >= 2
      ? source.slice(pipes[0]! + 1, pipes[1]!).trim()
      : source.slice(pipes[0]! + 1, closeStart).trim();
  const elseText = pipes.length >= 2 ? source.slice(pipes[1]! + 1, closeStart).trim() : "";

  return {
    end: closeStart + 2,
    head,
    thenText,
    elseText,
    hasPipe,
  };
}
