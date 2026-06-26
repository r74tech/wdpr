import type { LanguageDefinition } from "../types";
import { buildEndPattern } from "./end-pattern";
import { resolveKeywordClass } from "./keywords";
import { buildPartTokens } from "./parts";
import { preprocessHighlightInput } from "./preprocess";
import type { HighlightToken } from "./token";
import { findGroupPosition } from "./utils";

interface HighlighterState {
  state: number;
  lastdelim: string;
  lastinner: string;
  endpattern: RegExp | null;
}

/**
 * Tokenize source code using a language definition's state machine.
 */
export function tokenize(def: LanguageDefinition, input: string): HighlightToken[] {
  const str = preprocessHighlightInput(input);
  const len = str.length;
  if (len === 0) return [];

  let state = -1;
  let pos = 0;
  let lastinner = def.defClass;
  let lastdelim = def.defClass;
  let endpattern: RegExp | null = null;
  const stateStack: HighlighterState[] = [];
  const tokenStack: HighlightToken[] = [];
  const result: HighlightToken[] = [];

  function getToken(): HighlightToken | null {
    if (tokenStack.length > 0) {
      return tokenStack.pop()!;
    }
    if (pos >= len) {
      return null;
    }

    const endStateMatch = findEndStateMatch(str, pos, state, endpattern);
    const token = matchStateToken({
      def,
      str,
      pos,
      state,
      lastinner,
      lastdelim,
      endpattern,
      stateStack,
      tokenStack,
      endStateMatch,
      setPosition: (nextPos) => {
        pos = nextPos;
      },
      setState: (next) => {
        state = next.state;
        lastinner = next.lastinner;
        lastdelim = next.lastdelim;
        endpattern = next.endpattern;
      },
    });
    if (token) {
      return token;
    }

    if (endStateMatch.endpos > -1) {
      tokenStack.push({ class: lastdelim, content: endStateMatch.endmatch });
      if (endStateMatch.endpos > pos) {
        tokenStack.push({ class: lastinner, content: str.substring(pos, endStateMatch.endpos) });
      }
      const prev = stateStack.pop()!;
      state = prev.state;
      lastdelim = prev.lastdelim;
      lastinner = prev.lastinner;
      endpattern = prev.endpattern;
      pos = endStateMatch.endpos + endStateMatch.endmatch.length;
      if (tokenStack.length > 0) {
        return tokenStack.pop()!;
      }
      return getToken();
    }

    const p = pos;
    pos = len;
    return { class: lastinner, content: str.substring(p) };
  }

  let token: HighlightToken | null;
  while ((token = getToken()) !== null) {
    result.push(token);
  }

  return result;
}

interface EndStateMatch {
  endpos: number;
  endmatch: string;
}

function findEndStateMatch(
  str: string,
  pos: number,
  state: number,
  endpattern: RegExp | null,
): EndStateMatch {
  if (state === -1 || !endpattern) {
    return { endpos: -1, endmatch: "" };
  }

  endpattern.lastIndex = pos;
  const match = endpattern.exec(str);
  return match ? { endpos: match.index, endmatch: match[0] } : { endpos: -1, endmatch: "" };
}

interface MatchStateTokenArgs {
  def: LanguageDefinition;
  str: string;
  pos: number;
  state: number;
  lastinner: string;
  lastdelim: string;
  endpattern: RegExp | null;
  stateStack: HighlighterState[];
  tokenStack: HighlightToken[];
  endStateMatch: EndStateMatch;
  setPosition(pos: number): void;
  setState(state: HighlighterState): void;
}

function matchStateToken(args: MatchStateTokenArgs): HighlightToken | null {
  const reg = args.def.regs[args.state];
  if (!reg) return null;

  reg.lastIndex = args.pos;
  const match = reg.exec(args.str);
  if (!match) return null;

  const countsArr = args.def.counts[args.state]!;
  let captureIndex = 1;

  for (let patternIndex = 0; patternIndex < countsArr.length; patternIndex++) {
    const count = countsArr[patternIndex]!;
    if (captureIndex >= match.length) break;

    if (
      match[captureIndex] != null &&
      (args.endStateMatch.endpos === -1 || match.index < args.endStateMatch.endpos)
    ) {
      return emitMatchedPattern(args, match, patternIndex, captureIndex, count);
    }

    captureIndex += count + 1;
  }

  return null;
}

function emitMatchedPattern(
  args: MatchStateTokenArgs,
  match: RegExpExecArray,
  patternIndex: number,
  captureIndex: number,
  count: number,
): HighlightToken {
  const statesArr = args.def.states[args.state]!;
  const delimArr = args.def.delim[args.state]!;
  const matchStart = match.index;
  const matchStr = match[captureIndex]!;
  const groupStart = findGroupPosition(args.str, match, captureIndex, matchStart);

  if (statesArr[patternIndex] !== -1) {
    args.tokenStack.push({ class: delimArr[patternIndex]!, content: matchStr });
  } else {
    pushNonTransitionTokens(args, match, patternIndex, captureIndex, count, groupStart, matchStr);
  }

  if (groupStart > args.pos) {
    args.tokenStack.push({ class: args.lastinner, content: args.str.substring(args.pos, groupStart) });
  }

  args.setPosition(groupStart + matchStr.length);

  if (statesArr[patternIndex] !== -1) {
    enterState(args, match, patternIndex, captureIndex, count);
  }

  return args.tokenStack.pop()!;
}

function pushNonTransitionTokens(
  args: MatchStateTokenArgs,
  match: RegExpExecArray,
  patternIndex: number,
  captureIndex: number,
  count: number,
  groupStart: number,
  matchStr: string,
): void {
  let inner = args.def.inner[args.state]![patternIndex]!;
  const partDef = args.def.parts[args.state]?.[patternIndex];
  if (partDef) {
    pushPartTokens(args, match, partDef, captureIndex, count, groupStart, matchStr, inner);
    return;
  }

  inner = resolveKeywordClass(args.def, args.state, patternIndex, matchStr, inner);
  args.tokenStack.push({ class: inner, content: matchStr });
}

function pushPartTokens(
  args: MatchStateTokenArgs,
  match: RegExpExecArray,
  partDef: Record<number, string>,
  captureIndex: number,
  count: number,
  groupStart: number,
  matchStr: string,
  inner: string,
): void {
  const parts: HighlightToken[] = [];
  parts.push(...buildPartTokens(args.str, match, partDef, captureIndex, count, groupStart, matchStr, inner));
  args.tokenStack.push(...parts);
}

function enterState(
  args: MatchStateTokenArgs,
  match: RegExpExecArray,
  patternIndex: number,
  captureIndex: number,
  count: number,
): void {
  const statesArr = args.def.states[args.state]!;
  const delimArr = args.def.delim[args.state]!;
  const innerArr = args.def.inner[args.state]!;
  args.stateStack.push({
    state: args.state,
    lastdelim: args.lastdelim,
    lastinner: args.lastinner,
    endpattern: args.endpattern,
  });

  const prevState = args.state;
  const nextState = statesArr[patternIndex]!;
  const endRe = args.def.end[nextState];
  args.setState({
    state: nextState,
    lastinner: innerArr[patternIndex]!,
    lastdelim: delimArr[patternIndex]!,
    endpattern: buildEndPattern(args.def, prevState, patternIndex, count, captureIndex, match, endRe ?? undefined),
  });
}
