import type { DirectiveKind } from "./types";
import { isIdentChar } from "./chars";

/** Return the kind of `[[#xxx` directive at `i`, or null if none matches. */
export function matchDirectiveKind(source: string, i: number): DirectiveKind | null {
  if (!source.startsWith("[[#", i)) return null;
  // Order matters: `ifexpr` must be checked before `if` because the
  // shorter `if` prefix would otherwise consume `ifexpr` openings.
  if (source.startsWith("ifexpr", i + 3) && !isIdentChar(source[i + 9])) {
    return "ifexpr";
  }
  if (source.startsWith("if", i + 3) && !isIdentChar(source[i + 5])) {
    return "if";
  }
  if (source.startsWith("expr", i + 3) && !isIdentChar(source[i + 7])) {
    return "expr";
  }
  return null;
}
