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
import { hasClosingMarkerBeforeNewline } from "../types";

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
    // Check if closing bracket exists
    if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: ctx.pos + 1 }, "BRACKET_CLOSE")) {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Check for new tab marker (*)
    let newTab = false;
    if (ctx.tokens[pos]?.type === "STAR") {
      newTab = true;
      pos++;
      consumed++;
    }

    // Collect URL (until whitespace)
    let url = "";
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
      url += token.value;
      pos++;
      consumed++;
    }

    // URL must be valid (starts with http://, https://, or /)
    const trimmedUrl = url.trim();
    if (!isValidUrl(trimmedUrl)) {
      return { success: false };
    }

    // Skip whitespace between URL and label
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
      // No closing bracket found
      return { success: false };
    }

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      return { success: false };
    }

    const linkLabel: LinkLabel = { text: trimmedLabel };

    return {
      success: true,
      elements: [
        {
          element: "link",
          data: {
            type: "direct",
            link: trimmedUrl,
            extra: null,
            label: linkLabel,
            target: newTab ? "new-tab" : null,
          },
        },
      ],
      consumed,
    };
  },
};

/**
 * Validates whether a URL is acceptable for single-bracket links.
 *
 * Only absolute HTTP(S) URLs and site-relative paths (starting with `/`)
 * are accepted. Page names, interwiki prefixes, and other formats require
 * triple-bracket syntax instead.
 *
 * @param url - The trimmed URL string to validate
 * @returns `true` if the URL starts with `http://`, `https://`, or `/`
 */
function isValidUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return true;
  if (url.startsWith("http://") || url.startsWith("https://")) return true;
  return false;
}
