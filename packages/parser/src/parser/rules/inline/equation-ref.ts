/**
 * @module equation-ref
 *
 * Parses the Wikidot equation reference syntax: `[[eref name]]`.
 *
 * An equation reference creates a clickable link that points to a
 * named equation block defined elsewhere on the page (via
 * `[[equation name]]` block syntax in the block-level parser). The
 * reference is rendered as the equation's assigned number.
 *
 * Only the short form `eref` is recognized as a valid keyword.
 * The long form `[[equation name]]` is NOT supported by Wikidot for
 * inline references and is rendered as plain text.
 *
 * Produces an `"equation-reference"` AST element whose `data` field
 * contains the reference name string.
 *
 * Wikidot syntax example:
 * - `[[eref myEquation]]` -- references equation named "myEquation"
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "../utils";

/**
 * Inline rule for parsing `[[eref name]]` equation references.
 *
 * Triggered by a `BLOCK_OPEN` (`[[`) token. The rule verifies the
 * block name is `eref` (case-insensitive), then collects the
 * reference name until the closing `]]`.
 *
 * Fails if the block name is not `eref`, the reference name is empty,
 * or `]]` is not found.
 */
export const equationRefRule: InlineRule = {
  name: "equation-ref",
  startTokens: ["BLOCK_OPEN"],

  /**
   * Attempts to parse an `[[eref name]]` reference at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with an `"equation-reference"` element,
   *          or `{ success: false }`
   */
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

    const blockName = nameResult.name.toLowerCase();
    // Only "eref" is supported in Wikidot
    if (blockName !== "eref") {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse reference name
    let refName = "";
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "BLOCK_CLOSE" || token.type === "NEWLINE") {
        break;
      }
      refName += token.value;
      pos++;
      consumed++;
    }

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    refName = refName.trim();

    // Empty reference is invalid
    if (!refName) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "equation-reference",
          data: refName,
        },
      ],
      consumed,
    };
  },
};
