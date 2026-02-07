/**
 * @module footnoteblock
 *
 * Block rule for the Wikidot footnote block: `[[footnoteblock]]`.
 *
 * This self-closing block tag marks the location in the page where all
 * collected footnotes (from `[[footnote]]...[[/footnote]]` inline markers)
 * should be rendered. It is analogous to a "footnotes section" placeholder.
 *
 * Optional attributes:
 * - `title` -- custom heading text for the footnotes section.
 * - `hide`  -- when `"true"` or `"yes"`, suppresses footnote rendering.
 *
 * Wikidot only honours the FIRST `[[footnoteblock]]` in a document;
 * subsequent occurrences are treated as plain text. The parser tracks this
 * via `ctx.footnoteBlockParsed`.
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Parses key/value attributes from tokens (e.g. `title="Custom title"`).
 *
 * This is a local attribute parser specific to the footnoteblock rule.
 * It handles TEXT or IDENTIFIER names, optional `=` with quoted or
 * unquoted values, and boolean attributes (name without value).
 *
 * @param ctx      - Parse context.
 * @param startPos - Token index to start scanning.
 * @returns Parsed attribute map and the number of tokens consumed.
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

/**
 * Block rule for `[[footnoteblock]]`.
 *
 * Parsing strategy:
 * 1. Match BLOCK_OPEN + name "footnoteblock" (case-insensitive).
 * 2. Parse optional attributes (`title`, `hide`).
 * 3. Consume closing `]]`.
 * 4. If `ctx.footnoteBlockParsed` is already `true`, fail -- only the
 *    first footnoteblock in a document is valid.
 * 5. Set `ctx.footnoteBlockParsed = true` and emit a `footnote-block`
 *    element.
 */
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
