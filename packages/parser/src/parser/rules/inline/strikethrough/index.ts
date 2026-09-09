/**
 *
 * Parses the Wikidot strikethrough formatting syntax: `--text--`.
 *
 * Strikethrough text is delimited by double hyphens. However, the `--`
 * token has dual meaning in Wikidot: it can be either a strikethrough
 * marker or an em-dash. The disambiguation rule is:
 *
 * - If a matching closing `--` is found within the same paragraph AND the closing
 *   marker is NOT preceded by whitespace, it is treated as strikethrough.
 * - Otherwise, the `--` is converted to an em-dash character (U+2014).
 *
 * This means `--word--` produces strikethrough, but `-- word --` produces
 * two em-dashes with "word" between them.
 *
 * Produces a `"container"` AST element with `type: "strikethrough"`,
 * or a `"text"` element containing the em-dash character.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { parseStrikethroughContent } from "./parse";
import { hasValidStrikethroughClose } from "./syntax";

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
    if (!hasValidStrikethroughClose(ctx)) {
      // Not valid strikethrough, convert to em-dash
      return {
        success: true,
        elements: [{ element: "text", data: "\u2014" }], // em-dash
        consumed: 1,
      };
    }

    return parseStrikethroughContent(ctx);
  },
};
