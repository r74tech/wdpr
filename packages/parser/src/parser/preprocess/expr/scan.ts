import { computeBracketDepths } from "../utils";
import { evaluateDirective } from "./evaluate";
import { matchDirectiveKind } from "./kind";
import { tryParseInnermostDirective } from "./parse";

/**
 * Walk `source`, locate every innermost `[[#if]]` / `[[#ifexpr]]` /
 * `[[#expr]]` directive that sits inside an unclosed `[[`, and replace
 * it with its evaluated string. Returns the source unchanged when no
 * replacements were made.
 */
export function expandInnermost(source: string): string {
  const depths = computeBracketDepths(source);
  let result = "";
  let i = 0;
  let replaced = false;

  while (i < source.length) {
    const kind = matchDirectiveKind(source, i);
    if (kind !== null && depths[i]! > 0) {
      const match = tryParseInnermostDirective(source, i, kind);
      if (match !== null) {
        result += evaluateDirective(kind, match);
        i = match.end;
        replaced = true;
        continue;
      }
    }
    result += source[i];
    i++;
  }

  return replaced ? result : source;
}
