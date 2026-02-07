/**
 * @module anchor-name
 *
 * Parses the Wikidot named anchor syntax: `[[# name]]`.
 *
 * A named anchor creates an invisible anchor target (`<a id="name">`)
 * that can be referenced by page-internal links such as `[#name Label]`
 * or triple-bracket anchor links like `[[[#name]]]`.
 *
 * The anchor name must consist exclusively of the characters
 * `[-_A-Za-z0-9.%]` (matching the original Wikidot regex
 * `/(\[\[# )([-_A-Za-z0-9.%]+?)(\]\])/i`).
 *
 * A whitespace gap is required between the `#` and the name
 * (`[[# myAnchor]]` is valid; `[[#myAnchor]]` is not).
 *
 * Produces an `"anchor-name"` AST element whose `data` field contains
 * the raw anchor name string.
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Tests whether a single character is a valid anchor name character.
 *
 * Wikidot restricts anchor names to ASCII alphanumerics, hyphens,
 * underscores, dots, and percent signs.
 *
 * @param char - A single character to validate
 * @returns `true` if the character is allowed in an anchor name
 */
function isValidAnchorChar(char: string): boolean {
  return /^[-_A-Za-z0-9.%]$/.test(char);
}

/**
 * Inline rule for parsing `[[# name]]` named anchor targets.
 *
 * Triggered by a `BLOCK_OPEN` (`[[`) token. The rule looks for the `#`
 * character followed by mandatory whitespace and then the anchor name.
 *
 * Parsing steps:
 * 1. Consume `[[` and optional leading whitespace
 * 2. Require a `#` token (HASH or TEXT `"#"`)
 * 3. Require at least one whitespace token after `#`
 * 4. Collect consecutive valid anchor-name characters as the name
 * 5. Require closing `]]`
 *
 * Fails if the anchor name is empty or if `]]` is not found.
 */
export const anchorNameRule: InlineRule = {
  name: "anchorName",
  startTokens: ["BLOCK_OPEN"],

  /**
   * Attempts to parse a `[[# name]]` named anchor at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with an `"anchor-name"` element, or `{ success: false }`
   */
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
