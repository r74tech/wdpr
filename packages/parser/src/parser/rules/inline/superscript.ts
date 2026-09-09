/**
 *
 * Parses the Wikidot superscript formatting syntax: `^^text^^`.
 *
 * Superscript text is delimited by double carets. The opening and
 * closing markers must appear within the same paragraph. If no closing `^^`
 * is found before a block boundary, the opening marker is emitted as literal text.
 *
 * Empty superscript (`^^^^`) is silently discarded by Wikidot (produces
 * no output), matching the behavior of bold and subscript.
 *
 * Renders as a `<sup>` element in HTML.
 *
 * Produces a `"container"` AST element with `type: "superscript"`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { parseDelimitedContainer } from "./formatting/container";

/**
 * Inline rule for parsing `^^superscript^^` formatting.
 *
 * Triggered by a `SUPER_MARKER` token (`^^`). Checks for a matching
 * closing marker within the same paragraph, then recursively parses inline
 * content between the markers.
 *
 * When no closing marker is found, the opening `^^` is treated as
 * literal text.
 */
export const superscriptRule: InlineRule = {
  name: "superscript",
  startTokens: ["SUPER_MARKER"],

  /**
   * Attempts to parse superscript formatting at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result containing either a `"container"` element
   *          with `type: "superscript"`, an empty array (for `^^^^`), or a
   *          text fallback for unmatched markers
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    return parseDelimitedContainer(ctx, "SUPER_MARKER", "superscript", {
      discardEmpty: true,
    });
  },
};
