/**
 *
 * Block rule for Wikidot single-line center alignment: `= text`.
 *
 * When a line begins with a single `=` followed by whitespace, the rest
 * of the line is rendered as a centered paragraph (`<p style="text-align: center;">`).
 *
 * This is distinct from the `[[=]]...[[/=]]` alignment container (handled
 * by `align.ts`), which wraps multiple block-level elements. The center
 * rule here only affects a single line.
 *
 * Conditions for the rule to match:
 * - Token must be EQUALS at the start of a line.
 * - Must be exactly one `=` (4+ consecutive equals are a content separator,
 *   handled by `content-separator.ts`).
 * - Must be followed by a WHITESPACE token.
 *
 * The inline content is parsed until the end of line.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseInlineUntil } from "../inline/utils";

/**
 * Block rule for single-line center alignment (`= text`).
 *
 * Produces a paragraph container with `style: "text-align: center;"`.
 */
export const centerRule: BlockRule = {
  name: "center",
  startTokens: ["EQUALS"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const marker = currentToken(ctx);

    if (!marker.lineStart) {
      return { success: false };
    }

    // Wikidot requires whitespace after = for center alignment
    let pos = ctx.pos + 1;
    let consumed = 1;

    if (ctx.tokens[pos]?.type !== "WHITESPACE") {
      return { success: false };
    }

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse inline content until newline
    const inlineCtx: ParseContext = { ...ctx, pos };
    const inlineResult = parseInlineUntil(inlineCtx, "NEWLINE");
    const children: Element[] = inlineResult.elements;
    consumed += inlineResult.consumed;
    pos += inlineResult.consumed;

    // Consume newline
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      consumed++;
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {
              style: "text-align: center;",
            },
            elements: children,
          },
        },
      ],
      consumed,
    };
  },
};
