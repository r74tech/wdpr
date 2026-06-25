import type { Element } from "@wdprlib/ast";
import type { ParseContext, RuleResult } from "../../types";
import { currentToken, hasClosingMarkerBeforeNewline } from "../../types";
import { emptyRaw, rawElement, textElement } from "./result";

export function parseDoubleAtRaw(ctx: ParseContext): RuleResult<Element> {
  const startToken = currentToken(ctx);
  let pos = ctx.pos + 1;

  if (ctx.tokens[pos]?.type === "RAW_OPEN") {
    return emptyRaw(2);
  }

  if (!hasClosingMarkerBeforeNewline({ ...ctx, pos }, "RAW_OPEN")) {
    if (ctx.tokens[pos]?.type === "NEWLINE" && ctx.tokens[pos + 1]?.type === "RAW_OPEN") {
      return emptyRaw(3);
    }
    return textElement(startToken.value, 1);
  }

  let value = "";
  let consumed = 1;
  let hasBlockOpen = false;
  let hasBlockClose = false;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "RAW_OPEN" || token.type === "NEWLINE" || token.type === "EOF") {
      break;
    }

    if (token.type === "RAW_BLOCK_CLOSE") {
      const splitResult = tryConsumeSplitBlockClose(ctx, pos, value, consumed);
      if (splitResult) {
        return splitResult;
      }
      hasBlockClose = true;
    }
    if (token.type === "RAW_BLOCK_OPEN") {
      hasBlockOpen = true;
    }

    value += token.value;
    consumed++;
    pos++;
  }

  if (ctx.tokens[pos]?.type === "RAW_OPEN") {
    consumed++;
  }

  if (hasBlockOpen && hasBlockClose) {
    return emptyRaw(consumed);
  }

  return rawElement(value, consumed);
}

function tryConsumeSplitBlockClose(
  ctx: ParseContext,
  pos: number,
  value: string,
  consumed: number,
): RuleResult<Element> | null {
  const nextToken = ctx.tokens[pos + 1];
  if (nextToken?.type !== "RAW_OPEN") {
    return null;
  }

  return {
    success: true,
    elements: [
      { element: "raw", data: `${value}>` },
      { element: "text", data: "@" },
    ],
    consumed: consumed + 2,
  };
}
