/**
 * Center align rule: = text
 *
 * Creates a centered paragraph.
 * Requires: line start + = + space + text
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseInlineUntil } from "../inline/utils";

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
