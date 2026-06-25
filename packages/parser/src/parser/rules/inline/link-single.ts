/**
 *
 * Parses the Wikidot single-bracket link syntax: `[url label]`.
 *
 * Single-bracket links create hyperlinks to external URLs or
 * site-relative paths. The URL and label are separated by whitespace.
 *
 * Supported URL formats:
 * - Absolute URLs: `[https://example.com/ Label]`
 * - Relative paths: `[/some-page Label]`
 *
 * An optional `*` prefix on the URL opens the link in a new tab:
 * `[*https://example.com/ Opens in new tab]`.
 *
 * Unlike triple-bracket links (`[[[page]]]`), single-bracket links
 * require a full URL (starting with `http://`, `https://`, or `/`).
 * The label text is required.
 *
 * Produces a `"link"` AST element with `type: "direct"`.
 *
 * @module
 */
import type { Element, LinkLabel } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { parseSingleBracketLink } from "./link-bracket/parsed";

/**
 * Inline rule for parsing `[url label]` single-bracket links.
 *
 * Triggered by a `BRACKET_OPEN` (`[`) token. Optionally detects a
 * `*` prefix for new-tab behavior, then collects the URL (until
 * whitespace) and the label text (until `]`).
 *
 * Fails if:
 * - No closing `]` is found on the same line
 * - The URL does not start with `http://`, `https://`, or `/`
 * - The label text is empty
 */
export const linkSingleRule: InlineRule = {
  name: "linkSingle",
  startTokens: ["BRACKET_OPEN"],

  /**
   * Attempts to parse a single-bracket link at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with a `"link"` element of type `"direct"`,
   *          or `{ success: false }`
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const parsed = parseSingleBracketLink(ctx);
    if (!parsed) return { success: false };

    const linkLabel: LinkLabel = { text: parsed.labelText };

    return {
      success: true,
      elements: [
        {
          element: "link",
          data: {
            type: "direct",
            link: parsed.link,
            extra: null,
            label: linkLabel,
            target: parsed.target,
          },
        },
      ],
      consumed: parsed.consumed,
    };
  },
};
