/**
 *
 * Parses the Wikidot anchor inline block syntax: `[[a]]...[[/a]]`.
 *
 * An anchor wraps inline content in an HTML `<a>` element, allowing
 * href, target, and other HTML attributes to be specified.
 *
 * Wikidot syntax variants:
 * - `[[a href="url"]]text[[/a]]` -- basic anchor with href
 * - `[[a_ href="url"]]text[[/a]]` -- paragraph strip mode (trailing underscore)
 *
 * Paragraph strip mode (`[[a_]]`) suppresses newlines within the anchor
 * body and strips at most one trailing newline after the closing tag
 * (preserving double newlines as paragraph breaks). This prevents
 * unwanted `<br>` elements when consecutive anchor blocks are placed on
 * separate lines.
 *
 * The `target` attribute is extracted and mapped to a semantic enum value
 * (`"new-tab"`, `"parent"`, `"top"`, `"same"`), while the remaining
 * attributes (including `href`) are passed through after URL sanitization.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { buildAnchorAttributes } from "./attributes";
import { parseAnchorContent } from "./content";
import { parseAnchorOpen } from "./open";

/**
 * Inline rule for parsing `[[a]]...[[/a]]` blocks.
 *
 * Triggered by a `BLOCK_OPEN` (`[[`) token. The rule verifies the block name
 * is `a` or `anchor` (optionally with `_` suffix), parses HTML attributes,
 * then recursively parses inline content until the matching closing tag.
 *
 * Produces an `"anchor"` AST element containing the parsed children, a
 * semantic `target` value, and the sanitized attribute map.
 *
 * Edge cases:
 * - If no matching closing tag is found, the rule fails (returns `{ success: false }`),
 *   allowing the tokens to fall through to other rules or the text fallback.
 * - In paragraph strip mode, newlines within the body are consumed silently
 *   rather than converted to line-break elements. After the closing tag,
 *   at most one trailing newline is consumed to prevent a line-break between
 *   consecutive `[[a_]]` blocks, but double newlines are preserved as
 *   paragraph breaks.
 * - The `href` attribute is sanitized to block `javascript:`, `data:`, and
 *   `vbscript:` schemes.
 */
export const anchorRule: InlineRule = {
  name: "anchor",
  startTokens: ["BLOCK_OPEN"],

  /**
   * Attempts to parse an anchor block starting at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with an `"anchor"` element, or `{ success: false }`
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const openResult = parseAnchorOpen(ctx);
    if (!openResult) {
      return { success: false };
    }

    const contentResult = parseAnchorContent(ctx, openResult.bodyStart, openResult.paragraphStrip);
    const consumed = openResult.consumed + contentResult.consumed;

    if (!contentResult.foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: `Missing closing tag [[/a]] for [[${openResult.name}]]`,
        position: openToken.position,
      });
      return { success: false };
    }

    const anchorAttrs = buildAnchorAttributes(openResult.attributes);

    return {
      success: true,
      elements: [
        {
          element: "anchor",
          data: {
            target: anchorAttrs.target,
            attributes: anchorAttrs.attributes,
            elements: contentResult.children,
          },
        },
      ],
      consumed,
    };
  },
};
