/**
 * @module underline
 *
 * Parses the Wikidot underline formatting syntax: `__text__`.
 *
 * Underline text is delimited by double underscores. Unlike most
 * inline formatting markers (bold, italic, etc.) which require the
 * closing marker on the same line, underline markers can span
 * multiple lines within the same paragraph. The closing marker
 * must appear before a paragraph break (blank line).
 *
 * Single newlines within underlined content are converted to
 * `<br />` elements, matching Wikidot's multiline underline behavior.
 *
 * If no closing `__` is found before a paragraph break, the opening
 * marker is emitted as literal text.
 *
 * Empty underline (`____`) is silently discarded by Wikidot (produces
 * no output).
 *
 * Renders as a `<u>` element in HTML.
 *
 * Produces a `"container"` AST element with `type: "underline"`.
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken, hasClosingMarkerBeforeParagraphBreak } from "../types";
import { parseInlineUntil } from "./utils";

/**
 * Inline rule for parsing `__underline__` formatting.
 *
 * Triggered by an `UNDERLINE_MARKER` token (`__`). Uses
 * {@link hasClosingMarkerBeforeParagraphBreak} instead of the
 * single-line variant because Wikidot allows underline to span
 * multiple lines within a paragraph.
 *
 * When no closing marker is found before a paragraph break, the
 * opening `__` is treated as literal text.
 */
export const underlineRule: InlineRule = {
  name: "underline",
  startTokens: ["UNDERLINE_MARKER"],

  /**
   * Attempts to parse underline formatting at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result containing either a `"container"` element
   *          with `type: "underline"`, an empty array (for `____`), or a
   *          text fallback for unmatched markers
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const startToken = currentToken(ctx);

    // Check if closing marker exists before paragraph break
    if (!hasClosingMarkerBeforeParagraphBreak({ ...ctx, pos: ctx.pos + 1 }, "UNDERLINE_MARKER")) {
      return {
        success: true,
        elements: [{ element: "text", data: startToken.value }],
        consumed: 1,
      };
    }

    // Parse content between markers, handling newlines as line-breaks
    const children: Element[] = [];
    let pos = ctx.pos + 1;
    let consumed = 1; // opening marker

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") break;

      // Found closing marker
      if (token.type === "UNDERLINE_MARKER") {
        consumed++;
        break;
      }

      // Handle newlines as line-breaks
      if (token.type === "NEWLINE") {
        children.push({ element: "line-break" });
        pos++;
        consumed++;
        continue;
      }

      // Parse inline content until NEWLINE or closing marker
      const inlineCtx = { ...ctx, pos };
      const result = parseInlineUntil(inlineCtx, "UNDERLINE_MARKER");
      if (result.elements.length > 0) {
        children.push(...result.elements);
        pos += result.consumed;
        consumed += result.consumed;
      } else {
        children.push({ element: "text", data: token.value });
        pos++;
        consumed++;
      }
    }

    // Empty underline (____) is discarded entirely in Wikidot
    if (children.length === 0) {
      return {
        success: true,
        elements: [],
        consumed,
      };
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "underline",
            attributes: {},
            elements: children,
          },
        },
      ],
      consumed,
    };
  },
};
