/**
 * Named anchor rule: [[# name]]
 *
 * Creates an anchor target for page-internal links.
 * Wikidot regex: /(\[\[# )([-_A-Za-z0-9.%]+?)(\]\])/i
 */
import type { Element } from "@wdpr/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Valid anchor name character: [-_A-Za-z0-9.%]
 */
function isValidAnchorChar(char: string): boolean {
  return /^[-_A-Za-z0-9.%]$/.test(char);
}

export const anchorNameRule: InlineRule = {
  name: "anchorName",
  startTokens: ["BLOCK_OPEN"],

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

    // Check for # (hash) - can be TEXT or HASH token
    const hashToken = ctx.tokens[pos];
    if (
      !hashToken ||
      (hashToken.type !== "HASH" && !(hashToken.type === "TEXT" && hashToken.value === "#"))
    ) {
      return { success: false };
    }
    pos++;
    consumed++;

    // Require whitespace after #
    if (ctx.tokens[pos]?.type !== "WHITESPACE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip additional whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse anchor name - collect valid characters until ]]
    let name = "";
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
      // Check if all characters in token are valid anchor chars
      const value = token.value;
      let allValid = true;
      for (const char of value) {
        if (!isValidAnchorChar(char)) {
          allValid = false;
          break;
        }
      }
      if (!allValid) {
        break;
      }
      name += value;
      pos++;
      consumed++;
    }

    // Anchor name is required
    if (!name) {
      return { success: false };
    }

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    return {
      success: true,
      elements: [
        {
          element: "anchor-name",
          data: name,
        },
      ],
      consumed,
    };
  },
};
