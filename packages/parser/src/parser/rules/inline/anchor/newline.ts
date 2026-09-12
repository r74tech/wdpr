import { createAutomaticLineBreak } from "../parsing/automatic-line-break";
import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";

export interface AnchorNewlineResult {
  consumed: number;
}

export function consumeAnchorNewline(
  ctx: ParseContext,
  pos: number,
  paragraphStrip: boolean,
  children: Element[],
): AnchorNewlineResult {
  let consumed = 1;
  let nextPos = pos + 1;

  if (!paragraphStrip) {
    children.push(createAutomaticLineBreak(ctx.tokens[pos]!));
    while (ctx.tokens[nextPos]?.type === "WHITESPACE" && ctx.tokens[nextPos]?.lineStart) {
      nextPos++;
      consumed++;
    }
  }

  return { consumed };
}
