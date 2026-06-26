import type { HighlightToken } from "./token";

export function buildPartTokens(
  str: string,
  match: RegExpExecArray,
  partDef: Record<number, string>,
  captureIndex: number,
  count: number,
  groupStart: number,
  matchStr: string,
  inner: string,
): HighlightToken[] {
  const parts: HighlightToken[] = [];
  let partpos = groupStart;
  for (let j = 1; j <= count; j++) {
    const subIdx = j + captureIndex;
    if (subIdx >= match.length || match[subIdx] == null || match[subIdx] === "") continue;
    const subStr = match[subIdx]!;
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
  return parts;
}
