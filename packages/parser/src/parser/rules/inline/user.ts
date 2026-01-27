/**
 * User rule: [[user name]] or [[*user name]]
 *
 * Displays a user reference. With star (*), shows avatar.
 */
import type { Element } from "@wdpr/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

export const userRule: InlineRule = {
  name: "user",
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

    // Check for star (avatar flag)
    let showAvatar = false;
    if (ctx.tokens[pos]?.type === "STAR") {
      showAvatar = true;
      pos++;
      consumed++;
    }

    // Skip whitespace after star
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse block name
    const nameToken = ctx.tokens[pos];
    if (!nameToken || (nameToken.type !== "TEXT" && nameToken.type !== "IDENTIFIER")) {
      return { success: false };
    }

    const blockName = nameToken.value.toLowerCase();
    if (blockName !== "user") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse username - collect all tokens until ]]
    let username = "";
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
      username += token.value;
      pos++;
      consumed++;
    }

    // Trim whitespace from username
    username = username.trim();

    // Username is required
    if (!username) {
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
          element: "user",
          data: {
            name: username,
            "show-avatar": showAvatar,
          },
        },
      ],
      consumed,
    };
  },
};
