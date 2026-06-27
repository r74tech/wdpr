import type { LanguageDefinition } from "../types";

export function resolveKeywordClass(
  def: LanguageDefinition,
  state: number,
  patternIndex: number,
  matchStr: string,
  fallback: string,
): string {
  let kwDef = def.keywords[state]?.[patternIndex];
  if (!kwDef || kwDef === -1 || typeof kwDef !== "object" || Object.keys(kwDef).length === 0) {
    kwDef = def.keywords[-1]?.[patternIndex];
  }
  if (kwDef && kwDef !== -1 && typeof kwDef === "object") {
    for (const [group, re] of Object.entries(kwDef)) {
      if ((re as RegExp).test(matchStr)) {
        return def.kwmap[group] ?? fallback;
      }
    }
  }
  return fallback;
}
