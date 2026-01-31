import type { AttributeMap, Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "./utils";

export const iframeRule: BlockRule = {
  name: "iframe",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult || nameResult.name.toLowerCase() !== "iframe") {
      return { success: false };
    }
    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse URL (first argument)
    let url = "";
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token) break;
      if (token.type === "BLOCK_CLOSE" || token.type === "WHITESPACE" || token.type === "NEWLINE") {
        break;
      }
      url += token.value;
      pos++;
      consumed++;
    }

    if (!url) {
      return { success: false };
    }

    // Parse attributes
    const attributes: AttributeMap = {};

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

      // Parse key=value or key="value"
      if (token.type === "IDENTIFIER" || token.type === "TEXT") {
        const key = token.value;
        pos++;
        consumed++;

        // Skip whitespace
        while (ctx.tokens[pos]?.type === "WHITESPACE") {
          pos++;
          consumed++;
        }

        // Expect =
        if (ctx.tokens[pos]?.type === "EQUALS") {
          pos++;
          consumed++;

          // Skip whitespace
          while (ctx.tokens[pos]?.type === "WHITESPACE") {
            pos++;
            consumed++;
          }

          // Parse value
          let value = "";
          const valueToken = ctx.tokens[pos];
          if (valueToken?.type === "QUOTED_STRING") {
            // Remove quotes
            value = valueToken.value.slice(1, -1);
            pos++;
            consumed++;
          } else {
            // Unquoted value
            while (pos < ctx.tokens.length) {
              const vt = ctx.tokens[pos];
              if (
                !vt ||
                vt.type === "BLOCK_CLOSE" ||
                vt.type === "WHITESPACE" ||
                vt.type === "NEWLINE"
              ) {
                break;
              }
              value += vt.value;
              pos++;
              consumed++;
            }
          }

          attributes[key] = value;
        }
      } else {
        pos++;
        consumed++;
      }
    }

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip trailing newline
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    return {
      success: true,
      elements: [
        {
          element: "iframe",
          data: {
            url,
            attributes,
          },
        },
      ],
      consumed,
    };
  },
};
