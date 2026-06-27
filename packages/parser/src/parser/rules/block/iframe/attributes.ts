import type { AttributeMap } from "@wdprlib/ast";
import type { ParseContext } from "../../types";

/**
 * Whitelist of attributes permitted on `[[iframe]]`. Wikidot strips
 * `id` but permits `class`.
 */
const ALLOWED_IFRAME_ATTRS = new Set([
  "align",
  "class",
  "frameborder",
  "height",
  "scrolling",
  "style",
  "width",
]);

export function parseIframeAttributes(
  ctx: ParseContext,
  startPos: number,
): { attributes: AttributeMap; consumed: number } {
  const attributes: AttributeMap = {};
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "BLOCK_CLOSE") break;

    if (token.type === "NEWLINE") {
      break;
    }

    if (token.type === "WHITESPACE") {
      pos++;
      consumed++;
      continue;
    }

    if (token.type === "IDENTIFIER" || token.type === "TEXT") {
      const key = token.value;
      pos++;
      consumed++;

      while (ctx.tokens[pos]?.type === "WHITESPACE") {
        pos++;
        consumed++;
      }

      if (ctx.tokens[pos]?.type === "EQUALS") {
        pos++;
        consumed++;

        while (ctx.tokens[pos]?.type === "WHITESPACE") {
          pos++;
          consumed++;
        }

        const valueResult = parseIframeAttributeValue(ctx, pos);
        pos += valueResult.consumed;
        consumed += valueResult.consumed;

        const normalizedKey = key.toLowerCase();
        if (ALLOWED_IFRAME_ATTRS.has(normalizedKey)) {
          attributes[normalizedKey] = valueResult.value;
        }
      }
    } else {
      pos++;
      consumed++;
    }
  }

  return { attributes, consumed };
}

function parseIframeAttributeValue(
  ctx: ParseContext,
  startPos: number,
): { value: string; consumed: number } {
  const valueToken = ctx.tokens[startPos];
  if (valueToken?.type === "QUOTED_STRING") {
    return { value: valueToken.value.slice(1, -1), consumed: 1 };
  }

  let value = "";
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "BLOCK_CLOSE" ||
      token.type === "WHITESPACE" ||
      token.type === "NEWLINE"
    ) {
      break;
    }
    value += token.value;
    pos++;
    consumed++;
  }

  return { value, consumed };
}
