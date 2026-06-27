import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseBlockName } from "../utils";
import { collectIncludeArguments } from "./arguments";
import { parsePageRef } from "./location";
import { parseVariables } from "./variables";

export const includeRule: BlockRule = {
  name: "include",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult || nameResult.name.toLowerCase() !== "include") {
      return { success: false };
    }

    if (!ctx.settings.enablePageSyntax) {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    const args = collectIncludeArguments(ctx, pos);
    pos += args.consumed;
    consumed += args.consumed;

    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    if (!args.target) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "include",
          data: {
            "paragraph-safe": false,
            variables: parseVariables(args.argumentTokens),
            location: parsePageRef(args.target),
            elements: [],
          },
        },
      ],
      consumed,
    };
  },
};
