import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "./utils";

export const htmlBlockRule: BlockRule = {
  name: "html",
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
    if (!nameResult || nameResult.name.toLowerCase() !== "html") {
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

    // Collect HTML content until [[/html]]
    let contents = "";

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token) break;

      // Check for closing [[/html]]
      if (token.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        if (closeNameResult?.name.toLowerCase() === "html") {
          break;
        }
      }

      contents += token.value;
      pos++;
      consumed++;
    }

    // Consume [[/html]]
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

    // Store html block in context
    ctx.htmlBlocks.push(contents);

    return {
      success: true,
      elements: [
        {
          element: "html",
          data: {
            contents,
          },
        },
      ],
      consumed,
    };
  },
};
