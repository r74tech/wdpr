/**
 *
 * Parses the Wikidot star-link syntax: `[*url label]`.
 *
 * A star link is a convenience syntax for creating links that open
 * in a new tab/window. The `[*` opening delimiter is tokenized as
 * `BRACKET_STAR` by the lexer.
 *
 * Unlike the regular single-bracket link, the star link does not
 * require a specific URL scheme -- any non-empty URL is accepted.
 * If no label text is provided, the URL itself is used as the display text.
 *
 * The link always has `target: "new-tab"` regardless of the URL content.
 *
 * Wikidot syntax examples:
 * - `[*https://example.com/ Visit Example]` -- with label
 * - `[*https://example.com/]` -- URL used as label
 *
 * Produces a `"link"` AST element with `type: "direct"` and
 * `target: "new-tab"`.
 *
 * @module
 */
import type { Element, LinkLabel } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { parseStarBracketLink } from "./link-bracket/parsed";

/**
 * Inline rule for parsing `[*url label]` star links.
 *
 * Triggered by a `BRACKET_STAR` (`[*`) token. Collects the URL
 * (until whitespace) and the optional label text (until `]`).
 * When no label is provided, the URL serves as display text.
 *
 * Fails if:
 * - No closing `]` is found on the same line
 * - The URL is empty
 */
export const linkStarRule: InlineRule = {
  name: "linkStar",
  startTokens: ["BRACKET_STAR"],

  /**
   * Attempts to parse a star link at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with a `"link"` element, or `{ success: false }`
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const parsed = parseStarBracketLink(ctx);
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
