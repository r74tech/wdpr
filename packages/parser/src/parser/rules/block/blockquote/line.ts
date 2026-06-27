import type { ParseContext } from "../../types";
import { parseInlineUntil } from "../../inline/utils";
import type { ParsedBlockquoteLine } from "./lines";

/**
 * Safety limit for blockquote nesting depth.
 * Lines exceeding this depth are not parsed, preventing stack issues
 * on deeply nested or malicious input.
 */
const MAX_BLOCKQUOTE_DEPTH = 30;

export type BlockquoteLineParseResult =
  | { kind: "parsed"; line: ParsedBlockquoteLine; consumed: number }
  | { kind: "skipped"; consumed: number }
  | { kind: "stop" };

export function parseBlockquoteLine(
  ctx: ParseContext,
  startPos: number,
): BlockquoteLineParseResult {
  const markerToken = ctx.tokens[startPos];
  if (!markerToken || !markerToken.lineStart || markerToken.type !== "BLOCKQUOTE_MARKER") {
    return { kind: "stop" };
  }

  const depth = markerToken.value.length;
  if (depth > MAX_BLOCKQUOTE_DEPTH) {
    return { kind: "stop" };
  }

  let pos = startPos + 1;
  let consumed = 1;

  if (ctx.tokens[pos]?.type !== "WHITESPACE") {
    return { kind: "skipped", consumed: consumeLineRemainder(ctx, pos) + consumed };
  }

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const inlineCtx: ParseContext = { ...ctx, pos };
  const inlineResult = parseInlineUntil(inlineCtx, "NEWLINE");
  consumed += inlineResult.consumed;
  pos += inlineResult.consumed;

  let hasLineBreak = false;
  if (ctx.tokens[pos]?.type === "NEWLINE") {
    hasLineBreak = true;
    consumed++;
  }

  return {
    kind: "parsed",
    line: {
      depth: depth - 1,
      ltype: null,
      value: { elements: inlineResult.elements, hasLineBreak },
    },
    consumed,
  };
}

function consumeLineRemainder(ctx: ParseContext, startPos: number): number {
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length && ctx.tokens[pos]?.type !== "NEWLINE") {
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type === "NEWLINE") {
    consumed++;
  }

  return consumed;
}
