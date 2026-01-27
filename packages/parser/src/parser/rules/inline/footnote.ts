/**
 * Footnote rule: [[footnote]]content[[/footnote]]
 *
 * The footnote content is stored separately and the inline element
 * just marks where the footnote reference appears.
 */
import type { Element } from "@wdpr/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "../utils";
import { parseInlineUntil } from "./utils";

export const footnoteRule: InlineRule = {
  name: "footnote",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult) {
      return { success: false };
    }

    const blockName = nameResult.name;
    if (blockName !== "footnote") {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Expect ]]
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Parse content until [[/footnote]]
    const children: Element[] = [];

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") {
        break;
      }

      // Check for [[/footnote]]
      if (token.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        if (closeNameResult && closeNameResult.name === "footnote") {
          // Skip [[/footnote]]
          pos++; // [[/
          consumed++;
          pos += closeNameResult.consumed; // footnote
          consumed += closeNameResult.consumed;
          // Skip whitespace
          while (ctx.tokens[pos]?.type === "WHITESPACE") {
            pos++;
            consumed++;
          }
          // Skip ]]
          if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
            pos++;
            consumed++;
          }
          break;
        }
      }

      // Handle NEWLINE as line-break within footnotes
      if (token.type === "NEWLINE") {
        children.push({ element: "line-break" });
        pos++;
        consumed++;
        continue;
      }

      // Parse inline content (including newlines for multiline footnotes)
      const inlineCtx: ParseContext = { ...ctx, pos };
      const inlineResult = parseInlineUntil(inlineCtx, "BLOCK_END_OPEN");
      if (inlineResult.elements.length > 0) {
        children.push(...inlineResult.elements);
        pos += inlineResult.consumed;
        consumed += inlineResult.consumed;
      } else {
        // Fallback: just add as text
        children.push({ element: "text", data: token.value });
        pos++;
        consumed++;
      }
    }

    // Store footnote content in context
    ctx.footnotes.push(children);

    // Return simple footnote marker
    return {
      success: true,
      elements: [
        {
          element: "footnote",
        },
      ],
      consumed,
    };
  },
};
