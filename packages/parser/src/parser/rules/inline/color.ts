/**
 * @module color
 *
 * Parses the Wikidot inline color syntax: `##color|text##`.
 *
 * This syntax applies a CSS color to inline text. The color specifier
 * and the text content are separated by a pipe (`|`). Both parts are
 * required; an empty color or empty content causes the parse to fail.
 *
 * Supported color formats:
 * - 3-digit hex (e.g. `c00`) -- automatically prefixed with `#`
 * - 6-digit hex (e.g. `cc0000`) -- automatically prefixed with `#`
 * - Named CSS colors (e.g. `blue`, `red`)
 * - CSS color functions (e.g. `rgb(255,0,0)`)
 *
 * Wikidot syntax examples:
 * - `##c00|Apple##` -- red text reading "Apple"
 * - `##blue|Ocean##` -- blue text reading "Ocean"
 * - `##rgb(0,128,0)|Green text##` -- CSS function color
 *
 * Produces a `"color"` AST element with the resolved color value and
 * nested inline elements.
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { hasClosingMarkerBeforeNewline } from "../types";
import { parseInlineUntil } from "./utils";

/**
 * Inline rule for parsing `##color|text##` color formatting.
 *
 * Triggered by a `COLOR_MARKER` token (`##`). The rule collects the
 * color specifier until a `PIPE` token, then recursively parses inline
 * content until the closing `##`.
 *
 * Fails if:
 * - No closing `##` is found on the same line
 * - No pipe separator is present
 * - The color specifier or content is empty
 */
export const colorRule: InlineRule = {
  name: "color",
  startTokens: ["COLOR_MARKER"],

  /**
   * Attempts to parse color formatting at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with a `"color"` element, or `{ success: false }`
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    // Check if closing marker exists
    if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: ctx.pos + 1 }, "COLOR_MARKER")) {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1; // ##

    // Collect color specification until PIPE
    let colorSpec = "";
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (
        !token ||
        token.type === "PIPE" ||
        token.type === "COLOR_MARKER" ||
        token.type === "NEWLINE" ||
        token.type === "EOF"
      ) {
        break;
      }
      colorSpec += token.value;
      pos++;
      consumed++;
    }

    // Must have a PIPE separator
    if (ctx.tokens[pos]?.type !== "PIPE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Parse inline content until closing ##
    const contentResult = parseInlineUntil({ ...ctx, pos }, "COLOR_MARKER");
    pos += contentResult.consumed;
    consumed += contentResult.consumed;

    // Consume closing ##
    if (ctx.tokens[pos]?.type === "COLOR_MARKER") {
      pos++;
      consumed++;
    } else {
      return { success: false };
    }

    const textChildren = contentResult.elements;

    const trimmedColor = colorSpec.trim();

    // Wikidot requires non-empty color spec and non-empty content
    if (trimmedColor === "" || textChildren.length === 0) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "color",
          data: {
            color: hexifyColor(trimmedColor),
            elements: textChildren,
          },
        },
      ],
      consumed,
    };
  },
};

/**
 * Normalizes shorthand hex color values by prepending a `#` sign.
 *
 * Wikidot allows users to write hex colors without the `#` prefix
 * (e.g. `c00` or `ff0000`). This function detects 3- or 6-character
 * hex strings and adds the prefix. Non-hex color values (named colors,
 * CSS functions) are returned unchanged.
 *
 * @param color - The trimmed color string from the markup
 * @returns The color string, with `#` prepended if it was a bare hex value
 */
function hexifyColor(color: string): string {
  if (/^[a-fA-F0-9]{3}$/.test(color) || /^[a-fA-F0-9]{6}$/.test(color)) {
    return `#${color}`;
  }
  return color;
}
