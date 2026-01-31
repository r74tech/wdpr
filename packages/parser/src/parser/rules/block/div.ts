import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import {
  parseBlockName,
  parseAttributes,
  parseBlocksUntil,
  parseInlineContentUntil,
} from "./utils";

export const divRule: BlockRule = {
  name: "div",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false, // Allow nested [[div_]] inside [[div_]]

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
    // Check if it's a div or div_
    if (blockName !== "div" && blockName !== "div_") {
      return { success: false };
    }

    // div_ means paragraph strip (no paragraph wrapping)
    const paragraphStrip = blockName === "div_";

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Parse attributes
    const attrResult = parseAttributes(ctx, pos);
    pos += attrResult.consumed;
    consumed += attrResult.consumed;

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Wikidot: [[div]] must be followed by newline to be recognized as block
    // [[div]]inline[[/div]] is NOT recognized as div
    if (ctx.tokens[pos]?.type !== "NEWLINE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Close condition for [[/div]]
    const closeCondition = (checkCtx: ParseContext): boolean => {
      const token = checkCtx.tokens[checkCtx.pos];
      if (token?.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(checkCtx, checkCtx.pos + 1);
        if (closeNameResult?.name === "div") {
          return true;
        }
      }
      return false;
    };

    const bodyCtx: ParseContext = { ...ctx, pos };
    let children: Element[];

    if (paragraphStrip) {
      // div_ - parse inline content without paragraph wrapping
      const bodyResult = parseInlineContentUntil(bodyCtx, closeCondition);
      consumed += bodyResult.consumed;
      pos += bodyResult.consumed;
      children = bodyResult.elements;
    } else {
      // div - parse blocks with paragraph wrapping
      const bodyResult = parseBlocksUntil(bodyCtx, closeCondition);
      consumed += bodyResult.consumed;
      pos += bodyResult.consumed;
      children = bodyResult.elements;
    }

    // Consume [[/div]]
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

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "div",
            attributes: attrResult.attrs,
            elements: children,
          },
        },
      ],
      consumed,
    };
  },
};
