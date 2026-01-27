/**
 * Size rule: [[size Xpx]]text[[/size]]
 *
 */
import type { Element } from "@wdpr/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "../utils";
import { parseInlineUntil } from "./utils";

/**
 * Parse size value (e.g., "12pt", "90%", "2vh", "4px")
 */
function parseSizeValue(
  ctx: ParseContext,
  startPos: number,
): { size: string; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  // Skip whitespace
  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  // Collect size value tokens until ]]
  const parts: string[] = [];
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "BLOCK_CLOSE" ||
      token.type === "NEWLINE" ||
      token.type === "EOF"
    ) {
      break;
    }
    if (token.type === "WHITESPACE") {
      break; // Size value shouldn't have spaces
    }
    parts.push(token.value);
    pos++;
    consumed++;
  }

  if (parts.length === 0) {
    return null;
  }

  return { size: parts.join(""), consumed };
}

export const sizeRule: InlineRule = {
  name: "size",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult) {
      return { success: false };
    }

    const blockName = nameResult.name;
    if (blockName !== "size") {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Parse size value
    const sizeResult = parseSizeValue(ctx, pos);
    if (!sizeResult) {
      return { success: false };
    }

    pos += sizeResult.consumed;
    consumed += sizeResult.consumed;

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Parse inline content until [[/size]]
    const children: Element[] = [];

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") {
        break;
      }

      // Check for [[/size]]
      if (token.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        if (closeNameResult && closeNameResult.name === "size") {
          // Skip [[/size]]
          pos++; // [[/
          consumed++;
          pos += closeNameResult.consumed; // size
          consumed += closeNameResult.consumed;
          // Skip ]]
          if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
            pos++;
            consumed++;
          }
          break;
        }
      }

      // Parse inline content
      const inlineCtx: ParseContext = { ...ctx, pos };
      const inlineResult = parseInlineUntil(inlineCtx, "BLOCK_END_OPEN");
      if (inlineResult.elements.length > 0) {
        children.push(...inlineResult.elements);
        pos += inlineResult.consumed;
        consumed += inlineResult.consumed;
      } else {
        // Fallback: just add as text
        children.push({ element: "text", data: token.value });
        pos++;
        consumed++;
      }
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "size",
            attributes: { style: `font-size:${sizeResult.size};` },
            elements: children,
          },
        },
      ],
      consumed,
    };
  },
};
