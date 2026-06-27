import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseInlineUntil } from "../../inline/utils";

/**
 * Safety limit for list nesting depth.
 * Items deeper than this are not parsed, preventing stack overflow on
 * deeply nested or adversarial input.
 */
const MAX_LIST_DEPTH = 20;

export type InternalListType = "bullet" | "numbered";

export interface ParsedListLine {
  depth: number;
  ltype: InternalListType;
  value: Element[];
}

export type ListLineParseResult =
  | { kind: "parsed"; line: ParsedListLine; consumed: number }
  | { kind: "stop" };

export function parseNativeListLine(ctx: ParseContext, startPos: number): ListLineParseResult {
  const firstToken = ctx.tokens[startPos];

  if (!firstToken || !firstToken.lineStart) {
    return { kind: "stop" };
  }

  let pos = startPos;
  let consumed = 0;
  let depth = 0;

  if (firstToken.type === "WHITESPACE") {
    depth = firstToken.value.length;
    pos++;
    consumed++;
  }

  const markerToken = ctx.tokens[pos];
  if (!markerToken || (markerToken.type !== "LIST_BULLET" && markerToken.type !== "LIST_NUMBER")) {
    return { kind: "stop" };
  }

  if (depth > MAX_LIST_DEPTH) {
    return { kind: "stop" };
  }

  const ltype: InternalListType = markerToken.type === "LIST_BULLET" ? "bullet" : "numbered";
  pos++;
  consumed++;

  if (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const inlineCtx: ParseContext = { ...ctx, pos };
  const inlineResult = parseInlineUntil(inlineCtx, "NEWLINE");
  consumed += inlineResult.consumed;
  pos += inlineResult.consumed;

  if (ctx.tokens[pos]?.type === "NEWLINE") {
    consumed++;
  }

  return {
    kind: "parsed",
    line: {
      depth,
      ltype,
      value: inlineResult.elements,
    },
    consumed,
  };
}
