import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "./utils";

/**
 * Embed block rule: [[embed]]..[[/embed]], [[embedvideo]]..[[/embedvideo]], [[embedaudio]]..[[/embedaudio]]
 *
 * Wikidotでは許可リストにマッチしたHTMLのみ出力されるが、
 * このパーサーでは内容をそのままhtml要素として保持する。
 * バリデーションはレンダリング時またはサーバー側で行う想定。
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

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token) break;

      // Check for closing [[/embed*]]
      if (token.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        if (closeNameResult) {
          const closeName = closeNameResult.name.toLowerCase();
          if (closeName === "embed" || closeName === "embedvideo" || closeName === "embedaudio") {
            break;
          }
        }
      }

      contents += token.value;
      pos++;
      consumed++;
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
