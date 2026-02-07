/**
 *
 * Parses the Wikidot anchor link syntax: `[#anchor-name Label text]`
 * and the "fake link" variant `[# Label text]`.
 *
 * An anchor link creates a hyperlink that targets a named anchor on
 * the same page. The link's `href` is set to `#normalized-anchor-name`.
 *
 * The "fake link" variant (`[# Label]`) has no anchor name and generates
 * a link with `href="javascript:;"`. This is used in Wikidot for
 * interactive elements like collapsible blocks where the link serves
 * as a click target rather than navigation.
 *
 * Anchor names are normalized to lowercase with spaces replaced by hyphens.
 *
 * The opening delimiter is tokenized as `BRACKET_ANCHOR` (`[#`) by the
 * lexer, distinguishing it from regular bracket links.
 *
 * Produces a `"link"` AST element with `type: "anchor"`.
 *
 * @module
 */
import type { Element, LinkLabel } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { hasClosingMarkerBeforeNewline } from "../types";

/**
 * Inline rule for parsing `[#anchor Label]` anchor links.
 *
 * Triggered by a `BRACKET_ANCHOR` (`[#`) token. Collects the optional
 * anchor name, then the required label text, stopping at the closing
 * `]` bracket.
 *
 * Fails if:
 * - No closing `]` is found on the same line
 * - The label text is empty
 */
export const linkAnchorRule: InlineRule = {
  name: "linkAnchor",
  startTokens: ["BRACKET_ANCHOR"],

  /**
   * Attempts to parse an anchor link at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with a `"link"` element of type `"anchor"`,
   *          or `{ success: false }`
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    // Check if closing bracket exists
    if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: ctx.pos + 1 }, "BRACKET_CLOSE")) {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1; // [#

    // Collect anchor name (until whitespace)
    let anchor = "";
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (
        !token ||
        token.type === "WHITESPACE" ||
        token.type === "BRACKET_CLOSE" ||
        token.type === "NEWLINE" ||
        token.type === "EOF"
      ) {
        break;
      }
      anchor += token.value;
      pos++;
      consumed++;
    }

    // Skip whitespace between anchor and label
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Collect label (until closing bracket)
    let label = "";
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (
        !token ||
        token.type === "BRACKET_CLOSE" ||
        token.type === "NEWLINE" ||
        token.type === "EOF"
      ) {
        break;
      }
      label += token.value;
      pos++;
      consumed++;
    }

    // Consume closing bracket
    if (ctx.tokens[pos]?.type === "BRACKET_CLOSE") {
      pos++;
      consumed++;
    } else {
      return { success: false };
    }

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      return { success: false };
    }

    // Determine target: if anchor is empty, use javascript:; (fake link)
    // Otherwise, normalize and prepend #
    const target = anchor.trim() ? `#${normalizeAnchor(anchor.trim())}` : "javascript:;";
    const linkLabel: LinkLabel = { text: trimmedLabel };

    return {
      success: true,
      elements: [
        {
          element: "link",
          data: {
            type: "anchor",
            link: target,
            extra: null,
            label: linkLabel,
            target: null,
          },
        },
      ],
      consumed,
    };
  },
};

/**
 * Normalizes an anchor name for use in a URL fragment.
 *
 * Converts to lowercase and replaces whitespace sequences with single
 * hyphens, matching Wikidot's anchor normalization behavior.
 *
 * @param anchor - The raw anchor name from the markup
 * @returns The normalized anchor name suitable for a URL fragment
 */
function normalizeAnchor(anchor: string): string {
  return anchor.toLowerCase().replace(/\s+/g, "-");
}
