/**
 * @module strikethrough
 *
 * Parses the Wikidot strikethrough formatting syntax: `--text--`.
 *
 * Strikethrough text is delimited by double hyphens. However, the `--`
 * token has dual meaning in Wikidot: it can be either a strikethrough
 * marker or an em-dash. The disambiguation rule is:
 *
 * - If a matching closing `--` is found on the same line AND the closing
 *   marker is NOT preceded by whitespace, it is treated as strikethrough.
 * - Otherwise, the `--` is converted to an em-dash character (U+2014).
 *
 * This means `--word--` produces strikethrough, but `-- word --` produces
 * two em-dashes with "word" between them.
 *
 * Produces a `"container"` AST element with `type: "strikethrough"`,
 * or a `"text"` element containing the em-dash character.
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { parseInlineUntil } from "./utils";

/**
 * Validates whether the current position contains a valid strikethrough
 * pair (opening and closing `--` markers).
 *
 * Scans from the token after the opening marker to find a closing
 * `STRIKE_MARKER`. The strikethrough is invalid if:
 * - No closing marker is found before a newline or EOF
 * - The closing marker is preceded by a whitespace token
 *
 * The whitespace restriction exists because Wikidot distinguishes
 * `--text--` (strikethrough) from `-- text --` (em-dashes).
 *
 * @param ctx - Parse context positioned at the opening `--` marker
 * @returns `true` if a valid strikethrough pair is found
 */
function isValidStrikethrough(ctx: ParseContext): boolean {
  let pos = ctx.pos + 1; // Start after opening marker
  let prevWasWhitespace = false;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      return false;
    }

    if (token.type === "STRIKE_MARKER") {
      // Found closing marker
      // Invalid if preceded by whitespace
      if (prevWasWhitespace) {
        return false;
      }
      return true;
    }

    prevWasWhitespace = token.type === "WHITESPACE";
    pos++;
  }
  return false;
}

/**
 * Inline rule for parsing `--strikethrough--` formatting or converting
 * `--` to an em-dash.
 *
 * Triggered by a `STRIKE_MARKER` token (`--`). First validates whether
 * a proper strikethrough pair exists. If yes, parses the content
 * between markers as strikethrough. If no, converts the `--` to an
 * em-dash character (U+2014).
 */
export const strikethroughRule: InlineRule = {
  name: "strikethrough",
  startTokens: ["STRIKE_MARKER"],

  /**
   * Attempts to parse strikethrough formatting or produce an em-dash.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with either a `"container"` element of
   *          type `"strikethrough"`, or a `"text"` element containing
   *          the em-dash character
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    // Check if valid strikethrough (no whitespace before closing --)
    if (!isValidStrikethrough(ctx)) {
      // Not valid strikethrough, convert to em-dash
      return {
        success: true,
        elements: [{ element: "text", data: "\u2014" }], // em-dash
        consumed: 1,
      };
    }

    // Parse content between markers
    const result = parseInlineUntil({ ...ctx, pos: ctx.pos + 1 }, "STRIKE_MARKER");

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "strikethrough",
            attributes: {},
            elements: result.elements,
          },
        },
      ],
      consumed: 1 + result.consumed + 1, // open + content + close
    };
  },
};
