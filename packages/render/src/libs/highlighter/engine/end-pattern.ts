import type { LanguageDefinition } from "../types";
import { escapeRegex, matchingBrackets } from "./utils";

export function buildEndPattern(
  def: LanguageDefinition,
  prevState: number,
  patternIndex: number,
  count: number,
  captureIndex: number,
  match: RegExpExecArray,
  endRe: RegExp | undefined,
): RegExp | null {
  if (!def.subst[prevState]?.[patternIndex] || !endRe) {
    return endRe ?? null;
  }

  let epSource = endRe.source;
  for (let k = 0; k <= count; k++) {
    const subIdx = captureIndex + k;
    if (subIdx >= match.length || match[subIdx] == null) break;
    const quoted = escapeRegex(match[subIdx]!);
    epSource = epSource.replace(`%${k}%`, quoted);
    epSource = epSource.replace(`%b${k}%`, matchingBrackets(quoted));
  }
  return new RegExp(epSource, endRe.flags);
}
