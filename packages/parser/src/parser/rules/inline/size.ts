/**
 *
 * Parses the Wikidot font size syntax: `[[size value]]text[[/size]]`.
 *
 * This syntax wraps inline content in a `<span>` with an explicit
 * `font-size` CSS style. The size value must include a number and
 * a supported CSS unit.
 *
 * Supported units (matching Wikidot's implementation):
 * `px`, `em`, `rem`, `ex`, `%`, `cm`, `mm`, `in`, `pc`
 *
 * Notably, `pt`, `vh`, `vw`, and other modern CSS units are NOT
 * supported and will cause the parse to fail.
 *
 * Wikidot syntax examples:
 * - `[[size 120%]]larger text[[/size]]`
 * - `[[size 0.8em]]smaller text[[/size]]`
 * - `[[size 24px]]fixed size[[/size]]`
 *
 * Produces a `"container"` AST element with `type: "size"` and a
 * `style` attribute containing the `font-size` declaration.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "../utils";
import { parseInlineUntil } from "./utils";

/**
 * CSS size units that Wikidot recognizes in `[[size]]` blocks.
 * Other valid CSS units (like `pt`, `vh`, `vw`) are deliberately
 * excluded to match original Wikidot behavior.
 */
const VALID_SIZE_UNITS = ["px", "em", "rem", "ex", "%", "cm", "mm", "in", "pc"];

/**
 * Validates a size string against Wikidot-supported CSS units.
 *
 * The value must match the pattern `<number><unit>`, where the number
 * can be an integer or decimal and the unit must be one of the
 * {@link VALID_SIZE_UNITS}.
 *
 * @param size - The size string to validate (e.g. `"120%"`, `"1.5em"`)
 * @returns `true` if the size value is valid
 */
function isValidSizeValue(size: string): boolean {
  // Match number + unit pattern
  const unitPattern = VALID_SIZE_UNITS.join("|");
  const match = size.match(new RegExp(`^(\\d+(?:\\.\\d+)?)(${unitPattern})$`, "i"));
  return match !== null;
}

/**
 * Extracts and validates a size value from the token stream.
 *
 * Skips leading whitespace, then collects consecutive non-whitespace,
 * non-delimiter tokens and joins them into a size string. The resulting
 * string is validated against {@link isValidSizeValue}.
 *
 * @param ctx - The current parse context
 * @param startPos - Token index at which to begin scanning
 * @returns An object with the validated size string and tokens consumed,
 *          or `null` if no valid size value was found
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

  const size = parts.join("");

  // Validate against supported units
  if (!isValidSizeValue(size)) {
    return null;
  }

  return { size, consumed };
}

/**
 * Inline rule for parsing `[[size value]]text[[/size]]`.
 *
 * Triggered by a `BLOCK_OPEN` (`[[`) token. Verifies the block name
 * is `size`, parses and validates the size value, then recursively
 * parses inline content until the matching `[[/size]]` closing tag.
 *
 * Fails if:
 * - The block name is not `size`
 * - The size value is missing or uses an unsupported unit
 * - No closing `]]` after the size value
 */
export const sizeRule: InlineRule = {
  name: "size",
  startTokens: ["BLOCK_OPEN"],

  /**
   * Attempts to parse a size block at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with a `"container"` element of type `"size"`,
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
