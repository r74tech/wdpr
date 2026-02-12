/**
 *
 * Block rule for Wikidot embed blocks: `[[embed]]`, `[[embedvideo]]`,
 * and `[[embedaudio]]` (each with a matching closing tag).
 *
 * In original Wikidot, only HTML that matches a server-side allow-list is
 * rendered. This parser does not perform that filtering -- the raw content
 * between the tags is stored verbatim as an `embed-block` element. Validation
 * and sanitisation are expected to happen at rendering time or on the server.
 *
 * The embed block is wrapped in a paragraph container in the AST, matching
 * Wikidot's rendering behaviour where embeds sit inside `<p>` tags.
 *
 * If no closing tag is found, the rule fails to prevent consuming the rest
 * of the document.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "./utils";

/**
 * Block rule for `[[embed]]`, `[[embedvideo]]`, and `[[embedaudio]]`.
 *
 * Content between the opening and closing tags is captured as raw text.
 * The block name matching is case-insensitive; the closing tag may use
 * any of the three names (`embed`, `embedvideo`, `embedaudio`) regardless
 * of which was used to open.
 */
export const embedBlockRule: BlockRule = {
  name: "embed-block",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

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

    const blockName = nameResult.name.toLowerCase();
    if (blockName !== "embed" && blockName !== "embedvideo" && blockName !== "embedaudio") {
      return { success: false };
    }
    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Collect content until [[/embed]], [[/embedvideo]], or [[/embedaudio]]
    let contents = "";
    let foundClose = false;

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token) break;

      // Check for closing [[/embed*]]
      if (token.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        if (closeNameResult) {
          const closeName = closeNameResult.name.toLowerCase();
          if (closeName === "embed" || closeName === "embedvideo" || closeName === "embedaudio") {
            foundClose = true;
            break;
          }
        }
      }

      contents += token.value;
      pos++;
      consumed++;
    }

    // Require closing tag - without it, fail to prevent consuming entire document
    if (!foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: `Missing closing tag [[/${blockName}]] for [[${blockName}]]`,
        position: openToken.position,
      });
      return { success: false };
    }

    // Consume [[/embed*]]
    if (ctx.tokens[pos]?.type === "BLOCK_END_OPEN") {
      pos++;
      consumed++;
      const closeNameResult = parseBlockName(ctx, pos);
      if (closeNameResult) {
        pos += closeNameResult.consumed;
        consumed += closeNameResult.consumed;
      }
      if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
        pos++;
        consumed++;
      }
      if (ctx.tokens[pos]?.type === "NEWLINE") {
        pos++;
        consumed++;
      }
    }

    // Trim the contents
    contents = contents.trim();

    // Wikidotと同じく、embed-blockをparagraphで囲む
    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              {
                element: "embed-block",
                data: {
                  contents,
                },
              },
            ],
          },
        },
      ],
      consumed,
    };
  },
};
