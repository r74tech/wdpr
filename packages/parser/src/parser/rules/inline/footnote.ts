/**
 * Footnote rule: [[footnote]]content[[/footnote]]
 *
 * The footnote content is stored separately and the inline element
 * just marks where the footnote reference appears.
 */
import type { Element } from "@wdprlib/ast";
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
    // Wikidot footnote behavior:
    // - First paragraph: inline content (no <p> tag)
    // - After blank line: content wrapped in <p> tag
    const paragraphs: Element[][] = [[]];
    let currentParagraph = 0;

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

      // Handle NEWLINE - check if it's a paragraph break (blank line)
      if (token.type === "NEWLINE") {
        pos++;
        consumed++;
        // Look ahead for another NEWLINE (blank line = paragraph break)
        if (ctx.tokens[pos]?.type === "NEWLINE") {
          // Skip all consecutive newlines
          while (ctx.tokens[pos]?.type === "NEWLINE") {
            pos++;
            consumed++;
          }
          // Start new paragraph
          currentParagraph++;
          paragraphs[currentParagraph] = [];
        } else {
          // Single newline - just continue (becomes space or line-break)
          // For Wikidot compatibility, single newlines in footnotes become <br />
          paragraphs[currentParagraph]!.push({ element: "line-break" });
        }
        continue;
      }

      // Parse inline content (including newlines for multiline footnotes)
      const inlineCtx: ParseContext = { ...ctx, pos };
      const inlineResult = parseInlineUntil(inlineCtx, "BLOCK_END_OPEN");
      if (inlineResult.elements.length > 0) {
        paragraphs[currentParagraph]!.push(...inlineResult.elements);
        pos += inlineResult.consumed;
        consumed += inlineResult.consumed;
      } else {
        // Fallback: just add as text
        paragraphs[currentParagraph]!.push({ element: "text", data: token.value });
        pos++;
        consumed++;
      }
    }

    // Build children: first paragraph inline, subsequent paragraphs wrapped in <p>
    const children: Element[] = [];
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i]!;
      if (para.length === 0) continue;
      // Remove leading/trailing line-breaks
      while (para.length > 0 && para[0]?.element === "line-break") {
        para.shift();
      }
      while (para.length > 0 && para[para.length - 1]?.element === "line-break") {
        para.pop();
      }
      if (para.length === 0) continue;

      if (i === 0) {
        // First paragraph: inline
        children.push(...para);
      } else {
        // Subsequent paragraphs: wrapped in <p>
        children.push({
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: para,
          },
        });
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
