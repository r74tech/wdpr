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
 * - Email addresses: `[support@example.com Label]`
 * - Wikipedia links: `[wikipedia:Article]` or `[wikipedia:Article Label]`
 *
 * An optional `*` prefix on the URL opens the link in a new tab:
 * `[*https://example.com/ Opens in new tab]`.
 *
 * Unlike triple-bracket links (`[[[page]]]`), single-bracket links
 * require an external target or site-relative path.
 * The label text is required except for Wikipedia links.
 *
 * Produces a `"link"` AST element with `type: "direct"` or `"interwiki"`.
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
 * - The target is not a supported URL, email address, or Wikipedia target
 * - The label is empty for a non-Wikipedia target
 */
export const linkSingleRule: InlineRule = {
  name: "linkSingle",
  startTokens: ["BRACKET_OPEN"],

  /**
   * Attempts to parse a single-bracket link at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with a `"link"` element of type `"direct"` or `"interwiki"`,
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
            type: parsed.interwiki ? "interwiki" : "direct",
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
