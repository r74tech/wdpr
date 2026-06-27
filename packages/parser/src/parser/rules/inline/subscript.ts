/**
 *
 * Parses the Wikidot subscript formatting syntax: `,,text,,`.
 *
 * Subscript text is delimited by double commas. The opening and closing
 * markers must appear on the same line. If no closing `,,` is found
 * before a newline, the opening marker is emitted as literal text.
 *
 * Empty subscript (`,,,,`) is silently discarded by Wikidot (produces
 * no output), matching the behavior of bold and superscript.
 *
 * Renders as a `<sub>` element in HTML.
 *
 * Produces a `"container"` AST element with `type: "subscript"`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { parseSameLineDelimitedContainer } from "./formatting/container";

/**
 * Inline rule for parsing `,,subscript,,` formatting.
 *
 * Triggered by a `SUB_MARKER` token (`,,`). Checks for a matching
 * closing marker on the same line, then recursively parses inline
 * content between the markers.
 *
 * When no closing marker is found, the opening `,,` is treated as
 * literal text.
 */
export const subscriptRule: InlineRule = {
  name: "subscript",
  startTokens: ["SUB_MARKER"],

  /**
   * Attempts to parse subscript formatting at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result containing either a `"container"` element
   *          with `type: "subscript"`, an empty array (for `,,,,`), or a
   *          text fallback for unmatched markers
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    return parseSameLineDelimitedContainer(ctx, "SUB_MARKER", "subscript", { discardEmpty: true });
  },
};
