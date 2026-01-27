import type { Element } from "@wdpr/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken, hasClosingMarkerBeforeNewline } from "../types";

export const rawRule: InlineRule = {
  name: "raw",
  startTokens: ["RAW_OPEN", "RAW_BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const startToken = currentToken(ctx);

    // Handle @<...>@ syntax
    if (startToken.type === "RAW_BLOCK_OPEN") {
      return parseAngleRaw(ctx);
    }

    // Handle @@...@@ syntax
    return parseDoubleAtRaw(ctx);
  },
};

/**
 * Parse @@...@@ raw syntax
 */
function parseDoubleAtRaw(ctx: ParseContext): RuleResult<Element> {
  const startToken = currentToken(ctx);
  let pos = ctx.pos + 1;

  const next1 = ctx.tokens[pos];
  const next2 = ctx.tokens[pos + 1];

  // Special cases based on Wikidot:
  // @@@@@@ (RAW_OPEN RAW_OPEN RAW_OPEN) -> Raw("@@")
  if (next1?.type === "RAW_OPEN" && next2?.type === "RAW_OPEN") {
    return {
      success: true,
      elements: [{ element: "raw", data: "@@" }],
      consumed: 3,
    };
  }

  // @@@@@ (RAW_OPEN RAW_OPEN AT) -> Raw("@")
  if (next1?.type === "RAW_OPEN" && next2?.type === "AT") {
    return {
      success: true,
      elements: [{ element: "raw", data: "@" }],
      consumed: 3,
    };
  }

  // @@@@ (RAW_OPEN RAW_OPEN !RAW_OPEN) -> Raw("")
  if (next1?.type === "RAW_OPEN") {
    return {
      success: true,
      elements: [{ element: "raw", data: "" }],
      consumed: 2,
    };
  }

  // Check if closing @@ exists before newline
  if (!hasClosingMarkerBeforeNewline({ ...ctx, pos }, "RAW_OPEN")) {
    return {
      success: true,
      elements: [{ element: "text", data: startToken.value }],
      consumed: 1,
    };
  }

  // Collect raw content
  let value = "";
  let consumed = 1; // opening @@

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "RAW_OPEN" || token.type === "NEWLINE" || token.type === "EOF") {
      break;
    }
    value += token.value;
    consumed++;
    pos++;
  }

  // Consume closing @@
  if (ctx.tokens[pos]?.type === "RAW_OPEN") {
    consumed++;
  }

  return {
    success: true,
    elements: [{ element: "raw", data: value }],
    consumed,
  };
}

/**
 * Parse @<...>@ raw syntax
 */
function parseAngleRaw(ctx: ParseContext): RuleResult<Element> {
  const startToken = currentToken(ctx);
  let pos = ctx.pos + 1;

  // Check if closing >@ exists before newline
  if (!hasClosingMarkerBeforeNewline({ ...ctx, pos }, "RAW_BLOCK_CLOSE")) {
    return {
      success: true,
      elements: [{ element: "text", data: startToken.value }],
      consumed: 1,
    };
  }

  // Collect raw content
  let value = "";
  let consumed = 1; // opening @<

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "RAW_BLOCK_CLOSE" ||
      token.type === "NEWLINE" ||
      token.type === "EOF"
    ) {
      break;
    }
    value += token.value;
    consumed++;
    pos++;
  }

  // Consume closing >@
  if (ctx.tokens[pos]?.type === "RAW_BLOCK_CLOSE") {
    consumed++;
  }

  return {
    success: true,
    elements: [{ element: "raw", data: value }],
    consumed,
  };
}
