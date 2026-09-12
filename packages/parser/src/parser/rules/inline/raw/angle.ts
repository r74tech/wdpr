import type { Element } from "@wdprlib/ast";
import { decodeHTML } from "entities";
import type { ParseContext, RuleResult } from "../../types";
import { currentToken, hasClosingMarkerBeforeNewline } from "../../types";
import { rawElement, textElement } from "./result";

export function parseAngleRaw(ctx: ParseContext): RuleResult<Element> {
  const startToken = currentToken(ctx);
  let pos = ctx.pos + 1;

  if (!hasClosingMarkerBeforeNewline({ ...ctx, pos }, "RAW_BLOCK_CLOSE")) {
    if (ctx.tokens[pos]?.type === "NEWLINE" && ctx.tokens[pos + 1]?.type === "RAW_BLOCK_CLOSE") {
      return textElement(startToken.value, 3);
    }
    return textElement(startToken.value, 1);
  }

  let value = "";
  let consumed = 1;

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

  if (ctx.tokens[pos]?.type === "RAW_BLOCK_CLOSE") {
    consumed++;
  }

  return rawElement(decodeHTML(value), consumed);
}
