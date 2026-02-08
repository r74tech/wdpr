/**
 *
 * Parses the Wikidot triple-bracket link syntax: `[[[target | label]]]`.
 *
 * Triple-bracket links are Wikidot's primary page-linking mechanism.
 * They support several target formats:
 *
 * - Page links: `[[[page-name]]]` or `[[[page-name | Label]]]`
 * - Category pages: `[[[category:page-name]]]` (display shows text after colon)
 * - Anchor links: `[[[#anchor-name]]]`
 * - External URLs: `[[[https://example.com | Label]]]`
 * - Interwiki links: `[[[wikipedia:Article]]]` (for known prefixes)
 *
 * Special syntax:
 * - `[[[*page]]]` -- `*` prefix is treated as a label prefix (ignored in target)
 * - `[[[*|label]]]` -- links to root `/` with the given label
 * - `[[[page|]]]` -- empty label after pipe defaults to the page name
 *
 * Multi-line support: a single newline is allowed within the link
 * (typically after the pipe), but a double newline (paragraph break) or
 * a newline directly before `]]]` invalidates the link.
 *
 * When the opening `[[[` has no valid closing `]]]`, it falls through
 * as literal text rather than failing.
 *
 * Produces a `"link"` AST element with an appropriate `type` field
 * (`"page"`, `"anchor"`, `"direct"`, or `"interwiki"`).
 *
 * @module
 */
import type { Element, LinkType, LinkLocation, LinkLabel } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Scans ahead to check whether a valid `LINK_CLOSE` (`]]]`) token
 * exists, respecting Wikidot's multiline link rules.
 *
 * Allows at most one newline within the link content (typically after
 * the pipe separator). Rejects the link if:
 * - A double newline (paragraph break) is found
 * - A newline appears directly before the closing `]]]`
 * - EOF is reached without finding `]]]`
 *
 * @param ctx - The current parse context
 * @param startPos - Token index at which to begin scanning (after `[[[`)
 * @returns `true` if a valid closing `]]]` is found
 */
function hasClosingLinkMarker(ctx: ParseContext, startPos: number): boolean {
  let pos = startPos;
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      return false;
    }
    if (token.type === "LINK_CLOSE") {
      return true;
    }
    // Allow at most one newline, but not directly before LINK_CLOSE
    if (token.type === "NEWLINE") {
      const next = ctx.tokens[pos + 1];
      if (next?.type === "NEWLINE") {
        return false; // Double newline = paragraph break
      }
      // Newline directly before close = invalid
      if (next?.type === "LINK_CLOSE") {
        return false;
      }
    }
    pos++;
  }
  return false;
}

/**
 * Inline rule for parsing `[[[target | label]]]` triple-bracket links.
 *
 * Triggered by a `LINK_OPEN` (`[[[`) token. Collects the target string
 * and optional pipe-separated label, then determines the link type
 * (page, anchor, direct URL, or interwiki) based on the target format.
 *
 * When no valid closing `]]]` is found, the opening `[[[` is emitted
 * as literal text.
 *
 * Edge cases handled:
 * - Empty target with pipe (`[[[|text]]]`) is invalid
 * - Multiple consecutive `#` in the target (`[[[page##anchor]]]`) is invalid
 * - `[[[*|label]]]` links to root `/`
 * - `[[[*page]]]` strips the `*` prefix from the target
 * - Category pages show only the text after the colon when no label is given
 */
export const linkTripleRule: InlineRule = {
  name: "linkTriple",
  startTokens: ["LINK_OPEN"],

  /**
   * Attempts to parse a triple-bracket link at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with a `"link"` element, or a text
   *          fallback when the syntax is invalid
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const startToken = currentToken(ctx);

    if (!hasClosingLinkMarker(ctx, ctx.pos + 1)) {
      return {
        success: true,
        elements: [{ element: "text", data: startToken.value }],
        consumed: 1,
      };
    }

    // Collect tokens until LINK_CLOSE (allowing single newline)
    let target = "";
    let labelText = "";
    let foundPipe = false;
    let consumed = 1; // opening [[[
    let pos = ctx.pos + 1;

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "LINK_CLOSE" || token.type === "EOF") {
        break;
      }

      // Convert newlines to spaces in link content (Wikidot allows single newlines)
      if (token.type === "NEWLINE") {
        if (foundPipe) {
          labelText += " ";
        } else {
          target += " ";
        }
        consumed++;
        pos++;
        continue;
      }

      if (token.type === "PIPE" && !foundPipe) {
        foundPipe = true;
      } else if (foundPipe) {
        labelText += token.value;
      } else {
        target += token.value;
      }

      consumed++;
      pos++;
    }

    // Consume closing ]]]
    if (ctx.tokens[pos]?.type === "LINK_CLOSE") {
      consumed++;
    }

    const trimmedTarget = target.trim();

    // Invalid: empty target with pipe (e.g., [[[|some-page]]])
    if (trimmedTarget === "" && foundPipe) {
      return {
        success: true,
        elements: [{ element: "text", data: startToken.value }],
        consumed: 1,
      };
    }

    // Invalid: multiple consecutive # in target (e.g., [[[home###|Home]]], [[[page##anchor]]])
    // Wikidot rejects these as invalid link syntax
    if (/#{2,}/.test(trimmedTarget)) {
      return {
        success: true,
        elements: [{ element: "text", data: startToken.value }],
        consumed: 1,
      };
    }

    // Special case: [[[*|label]]] means link to root "/" with label
    let finalTarget = trimmedTarget;
    if (trimmedTarget === "*" && foundPipe) {
      finalTarget = "";
    }
    // Special case: [[[*page]]] - * is a label prefix, page is the target
    if (trimmedTarget.startsWith("*") && !foundPipe) {
      finalTarget = trimmedTarget.slice(1);
    }

    const { linkType, link } = determineLinkTypeAndLocation(finalTarget);
    const trimmedLabel = labelText.trim();

    // Determine display text
    let displayText: string;
    if (foundPipe) {
      // If label is empty (e.g., [[[page|]]]), use page name
      displayText = trimmedLabel || finalTarget;
    } else {
      // For category pages (system:Recent Changes), use only the part after colon
      const colonIdx = trimmedTarget.indexOf(":");
      if (colonIdx !== -1 && !trimmedTarget.startsWith("http")) {
        displayText = trimmedTarget.slice(colonIdx + 1).trim();
      } else {
        displayText = trimmedTarget;
      }
    }

    const label: LinkLabel = { text: displayText };

    return {
      success: true,
      elements: [
        {
          element: "link",
          data: {
            type: linkType,
            link,
            extra: null,
            label,
            target: null,
          },
        },
      ],
      consumed,
    };
  },
};

/**
 * Known interwiki prefixes recognized by Wikidot.
 *
 * Links whose target starts with one of these prefixes followed by a colon
 * (e.g. `wikipedia:Article`) are classified as interwiki links rather than
 * category page links.
 */
const INTERWIKI_PREFIXES = new Set(["wikipedia", "google", "dictionary", "wikidot"]);

/**
 * Determines the link type and structured location data from a raw
 * triple-bracket link target string.
 *
 * Classification order:
 * 1. Targets starting with `#` are anchor links
 * 2. Targets starting with `http://` or `https://` are direct (external) links
 * 3. Targets with a colon and a known interwiki prefix (without slashes)
 *    are interwiki links
 * 4. Everything else is a page link (including category pages like
 *    `system:Recent Changes`)
 *
 * @param target - The trimmed, processed link target string
 * @returns An object with `linkType` and `link` (the structured location data)
 */
function determineLinkTypeAndLocation(target: string): { linkType: LinkType; link: LinkLocation } {
  if (target.startsWith("#")) {
    return { linkType: "anchor", link: target };
  }
  if (target.startsWith("http://") || target.startsWith("https://")) {
    return { linkType: "direct", link: target };
  }
  // Check for interwiki links (only known prefixes)
  const colonIdx = target.indexOf(":");
  if (colonIdx > 0 && !target.includes("/")) {
    const prefix = target.slice(0, colonIdx).toLowerCase();
    if (INTERWIKI_PREFIXES.has(prefix)) {
      return { linkType: "interwiki", link: target };
    }
  }
  // Page link (includes category pages like "system:Recent Changes")
  return { linkType: "page", link: { site: null, page: target } };
}
