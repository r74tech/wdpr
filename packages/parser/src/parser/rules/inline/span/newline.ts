import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";

export interface SpanNewlineResult {
  consumed: number;
  afterBlankLine: boolean;
}

export function consumeSpanNewline(
  ctx: ParseContext,
  pos: number,
  paragraphStrip: boolean,
  afterBlankLine: boolean,
  children: Element[],
  escapedChildren: Element[],
  splitSpans: Element[][],
): SpanNewlineResult {
  let lookAhead = 1;
  while (ctx.tokens[pos + lookAhead]?.type === "WHITESPACE") {
    lookAhead++;
  }
  const nextToken = ctx.tokens[pos + lookAhead];

  if (nextToken?.type === "NEWLINE") {
    if (!paragraphStrip && children.length > 0) {
      splitSpans.push([...children]);
      children.length = 0;
    }

    let consumed = 1;
    let nextPos = pos + 1;
    while (ctx.tokens[nextPos]?.type === "WHITESPACE" || ctx.tokens[nextPos]?.type === "NEWLINE") {
      nextPos++;
      consumed++;
    }

    return { consumed, afterBlankLine: paragraphStrip };
  }

  const targetChildren = paragraphStrip && afterBlankLine ? escapedChildren : children;
  targetChildren.push({ element: "line-break" });
  let consumed = 1;
  let nextPos = pos + 1;
  while (ctx.tokens[nextPos]?.type === "WHITESPACE" && ctx.tokens[nextPos]?.lineStart) {
    nextPos++;
    consumed++;
  }

  return { consumed, afterBlankLine: false };
}
