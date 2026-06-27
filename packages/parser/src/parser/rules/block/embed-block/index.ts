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
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { collectEmbedContent, consumeEmbedClose } from "./content";
import { parseEmbedBlockOpen } from "./open";

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

    const openResult = parseEmbedBlockOpen(ctx, ctx.pos);
    if (!openResult) {
      return { success: false };
    }

    let pos = openResult.pos;
    let consumed = openResult.consumed;
    const contentResult = collectEmbedContent(ctx, pos);
    pos += contentResult.consumed;
    consumed += contentResult.consumed;

    if (!contentResult.foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: `Missing closing tag [[/${openResult.blockName}]] for [[${openResult.blockName}]]`,
        position: openToken.position,
      });
      return { success: false };
    }

    const closeConsumed = consumeEmbedClose(ctx, pos);
    pos += closeConsumed;
    consumed += closeConsumed;

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
                  contents: contentResult.contents.trim(),
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
