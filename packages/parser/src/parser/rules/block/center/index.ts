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
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { parseInlineUntil } from "../../inline/utils";
import { parseCenterOpen } from "./open";

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
    const openResult = parseCenterOpen(ctx);
    if (!openResult) return { success: false };

    // Parse inline content until newline
    let pos = openResult.bodyStart;
    let consumed = openResult.consumed;
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
