import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseInlineUntil } from "../../inline/utils";

export interface DefinitionItemKeyResult {
  keyString: string;
  key: Element[];
  consumed: number;
}

export function parseDefinitionItemKey(
  ctx: ParseContext,
  startPos: number,
): DefinitionItemKeyResult | null {
  let pos = startPos;
  let consumed = 0;

  const colonToken = ctx.tokens[pos];
  if (!colonToken || colonToken.type !== "COLON" || !colonToken.lineStart) {
    return null;
  }
  pos++;
  consumed++;

  const whitespaceAfterColon = ctx.tokens[pos];
  if (!whitespaceAfterColon || whitespaceAfterColon.type !== "WHITESPACE") {
    return null;
  }

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const keyTokens: string[] = [];
  const key: Element[] = [];
  let foundSecondColon = false;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      break;
    }
    if (token.type === "COLON") {
      foundSecondColon = true;
      pos++;
      consumed++;
      break;
    }

    const inlineCtx: ParseContext = { ...ctx, pos };
    const result = parseInlineUntil(inlineCtx, "COLON");
    if (result.elements.length > 0) {
      for (const element of result.elements) key.push(element);
      for (let i = 0; i < result.consumed; i++) {
        const t = ctx.tokens[pos + i];
        if (t) keyTokens.push(t.value);
      }
      pos += result.consumed;
      consumed += result.consumed;
    } else {
      keyTokens.push(token.value);
      pos++;
      consumed++;
    }
  }

  if (!foundSecondColon) {
    return null;
  }

  trimTrailingWhitespaceText(key);

  return {
    keyString: keyTokens.join("").trim(),
    key,
    consumed,
  };
}

function trimTrailingWhitespaceText(nodes: Element[]): void {
  while (nodes.length > 0) {
    const lastNode = nodes[nodes.length - 1];
    if (
      lastNode &&
      lastNode.element === "text" &&
      typeof lastNode.data === "string" &&
      lastNode.data.trim() === ""
    ) {
      nodes.pop();
    } else {
      break;
    }
  }
}
