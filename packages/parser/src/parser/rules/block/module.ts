import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "../utils";
import { parseAttributesRaw } from "./utils";
import { getModuleRuleByName } from "./module/mapping";

export const moduleRule: BlockRule = {
  name: "module",
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
    if (!nameResult || (nameResult.name !== "module" && nameResult.name !== "module654")) {
      return { success: false };
    }

    // Page syntax disabled (e.g., forum-post mode)
    if (!ctx.settings.enablePageSyntax) {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Get module name (next TEXT or IDENTIFIER token)
    let moduleName = "";
    const nameToken = ctx.tokens[pos];
    if (nameToken?.type === "TEXT" || nameToken?.type === "IDENTIFIER") {
      moduleName = nameToken.value;
      pos++;
      consumed++;
    }

    // Parse remaining attributes
    const attrResult = parseAttributesRaw(ctx, pos);
    pos += attrResult.consumed;
    consumed += attrResult.consumed;

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Dispatch to specific module parser
    const moduleParseRule = getModuleRuleByName(moduleName);

    // Check for body based on module rule's hasBody flag
    // For unknown modules, default to no body (they will be parsed as bodyless)
    let body: string | undefined;
    const moduleHasBody = moduleParseRule?.hasBody ?? false;

    if (moduleHasBody && ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;

      let bodyContent = "";
      while (pos < ctx.tokens.length) {
        const token = ctx.tokens[pos];
        if (!token || token.type === "EOF") {
          break;
        }

        if (token.type === "BLOCK_END_OPEN") {
          const closeNameResult = parseBlockName(ctx, pos + 1);
          if (
            closeNameResult &&
            (closeNameResult.name === "module" || closeNameResult.name === "module654")
          ) {
            pos++;
            consumed++;
            pos += closeNameResult.consumed;
            consumed += closeNameResult.consumed;
            if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
              pos++;
              consumed++;
            }
            if (ctx.tokens[pos]?.type === "NEWLINE") {
              pos++;
              consumed++;
            }
            break;
          }
        }

        bodyContent += token.value;
        pos++;
        consumed++;
      }

      if (bodyContent.trim()) {
        body = bodyContent.trim();
      }
    }

    if (moduleParseRule) {
      const result = moduleParseRule.parse(ctx, pos, attrResult.attrs, body);

      // Element を直接返すモジュール（CSS等）
      if ("element" in result) {
        return {
          success: true,
          elements: [result as Element],
          consumed,
        };
      }

      return {
        success: true,
        elements: [
          {
            element: "module",
            data: result,
          },
        ],
        consumed,
      };
    }

    return {
      success: true,
      elements: [
        {
          element: "module",
          data: {
            module: "unknown",
            name: moduleName,
            arguments: attrResult.attrs,
            body,
          },
        },
      ],
      consumed,
    };
  },
};
