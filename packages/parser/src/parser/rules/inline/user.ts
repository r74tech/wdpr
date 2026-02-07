/**
 * @module user
 *
 * Parses the Wikidot user reference syntax: `[[user name]]` and
 * `[[*user name]]`.
 *
 * A user reference displays a linked username (typically linking to
 * the user's profile page). The variant with a star prefix (`[[*user]]`)
 * also displays the user's avatar alongside the username.
 *
 * Wikidot syntax:
 * - `[[user some-user]]` -- displays username as a link
 * - `[[*user some-user]]` -- displays avatar and username
 *
 * Note: Wikidot requires no whitespace immediately after `[[`. This
 * means `[[ user name]]` is invalid, but `[[user name]]` and
 * `[[*user name]]` are valid.
 *
 * The username may contain any characters except `]]` and newlines.
 * Leading/trailing whitespace around the username is trimmed.
 *
 * Produces a `"user"` AST element with `data.name` (the username)
 * and `data["show-avatar"]` (boolean).
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Inline rule for parsing `[[user name]]` and `[[*user name]]` references.
 *
 * Triggered by a `BLOCK_OPEN` (`[[`) token. Optionally detects a `*`
 * prefix for avatar display, then verifies the keyword `user`, and
 * collects the username until `]]`.
 *
 * Fails if:
 * - Whitespace immediately follows `[[` (Wikidot requires no leading space)
 * - The keyword is not `user`
 * - The username is empty
 * - No closing `]]` is found
 */
export const userRule: InlineRule = {
  name: "user",
  startTokens: ["BLOCK_OPEN"],

  /**
   * Attempts to parse a user reference at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with a `"user"` element, or `{ success: false }`
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Wikidot requires no whitespace immediately after [[
    // [[ user]] is invalid, [[user]] is valid
    if (ctx.tokens[pos]?.type === "WHITESPACE") {
      return { success: false };
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
