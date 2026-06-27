import type { ParseContext } from "../../types";

export function repairSwallowedCodeClose(
  ctx: ParseContext,
  pos: number,
  attrs: Record<string, string>,
): { closingSwallowed: boolean } | null {
  const prevToken = ctx.tokens[pos - 1];
  if (prevToken?.type !== "QUOTED_STRING" || !prevToken.value.includes("]]")) {
    return null;
  }

  const rawValue = prevToken.value;
  const bracketIdx = rawValue.indexOf("]]");
  const truncatedValue = rawValue.startsWith('"')
    ? rawValue.slice(1, bracketIdx)
    : rawValue.slice(0, bracketIdx);

  for (const key of Object.keys(attrs)) {
    const stored = attrs[key]!;
    if (stored === rawValue || stored === rawValue.slice(1, -1) || stored === rawValue.slice(1)) {
      attrs[key] = truncatedValue;
      break;
    }
  }

  return {
    closingSwallowed: rawValue.includes("[[/code]]"),
  };
}
