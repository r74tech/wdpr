/**
 *
 * Parses the Wikidot bold formatting syntax: `**text**`.
 *
 * Bold text is delimited by double asterisks. The opening and closing
 * markers must appear on the same line; if no closing `**` is found
 * before a newline, the opening marker is emitted as literal text.
 *
 * Wikidot behavior for empty bold (`****`): the markers and their
 * (empty) content are discarded entirely, producing no output.
 *
 * Bold may nest other inline formatting (italic, underline, etc.)
 * within its body.
 *
 * Produces a `"container"` AST element with `type: "bold"`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { parseSameLineDelimitedContainer } from "./formatting/container";

/**
 * Inline rule for parsing `**bold**` formatting.
 *
 * Triggered by a `BOLD_MARKER` token (`**`). The rule checks for a
 * matching closing marker on the same line, then recursively parses
 * inline content between the markers.
 *
 * When no closing marker is found, the opening `**` is treated as
 * literal text rather than causing a parse failure, preserving
 * Wikidot's graceful-degradation behavior.
 */
export const boldRule: InlineRule = {
  name: "bold",
  startTokens: ["BOLD_MARKER"],

  /**
   * Attempts to parse bold formatting at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result containing either a `"container"` element
   *          with `type: "bold"`, an empty array (for `****`), or a text
   *          fallback for unmatched markers
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    return parseSameLineDelimitedContainer(ctx, "BOLD_MARKER", "bold", { discardEmpty: true });
  },
};
