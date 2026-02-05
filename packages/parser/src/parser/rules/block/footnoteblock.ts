/**
 * Footnote block rule: [[footnoteblock]] or [[footnoteblock title="Custom"]]
 *
 * This block marks where the collected footnotes should be rendered.
 * Supports optional title attribute.
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Parse attributes from tokens like: title="Custom title"
 */
function parseAttributes(
  ctx: ParseContext,
  startPos: number,
): { attrs: Record<string, string>; consumed: number } {
  const attrs: Record<string, string> = {};
  let pos = startPos;
  let consumed = 0;

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

    // Skip whitespace
    if (token.type === "WHITESPACE") {
      pos++;
      consumed++;
      continue;
    }

    // Attribute name (TEXT or IDENTIFIER token)
    if (token.type === "TEXT" || token.type === "IDENTIFIER") {
      const name = token.value.toLowerCase();
      pos++;
      consumed++;

      // Check for =
      const eqToken = ctx.tokens[pos];
      if (eqToken?.type === "EQUALS") {
        pos++;
        consumed++;

        // Get value (quoted string or text)
        const valueToken = ctx.tokens[pos];
        if (valueToken?.type === "QUOTED_STRING") {
          // Remove quotes
          let value = valueToken.value;
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          attrs[name] = value;
          pos++;
          consumed++;
        } else if (valueToken?.type === "TEXT" || valueToken?.type === "IDENTIFIER") {
          attrs[name] = valueToken.value;
          pos++;
          consumed++;
        }
      } else {
        // Boolean attribute
        attrs[name] = "true";
      }
    } else {
      // Unknown token, skip
      pos++;
      consumed++;
    }
  }

  return { attrs, consumed };
}

export const footnoteBlockRule: BlockRule = {
  name: "footnoteBlock",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Check for block name
    const nameToken = ctx.tokens[pos];
    if (!nameToken || (nameToken.type !== "TEXT" && nameToken.type !== "IDENTIFIER")) {
      return { success: false };
    }

    const blockName = nameToken.value.toLowerCase();
    if (blockName !== "footnoteblock") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Parse optional attributes (title="...")
    const { attrs, consumed: attrConsumed } = parseAttributes(ctx, pos);
    pos += attrConsumed;
    consumed += attrConsumed;

    // Expect ]]
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Only first footnoteblock is valid; subsequent ones become text
    if (ctx.footnoteBlockParsed) {
      return { success: false };
    }
    ctx.footnoteBlockParsed = true;

    // Extract title and hide from attributes
    const title = attrs.title !== undefined ? attrs.title : null;
    const hide = attrs.hide === "true" || attrs.hide === "yes";

    return {
      success: true,
      elements: [
        {
          element: "footnote-block",
          data: {
            title,
            hide,
          },
        },
      ],
      consumed,
    };
  },
};
