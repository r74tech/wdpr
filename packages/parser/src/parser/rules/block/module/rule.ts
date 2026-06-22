import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseModuleBody } from "./body";
import { createUnknownModuleElement, moduleParseResultToElement } from "./element";
import { getModuleRuleByName } from "./mapping";
import { parseModuleOpen } from "./open";

export const moduleRule: BlockRule = {
  name: "module",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const openResult = parseModuleOpen(ctx);
    if (!openResult) {
      return { success: false };
    }

    // Page syntax disabled (e.g., forum-post mode)
    if (!ctx.settings.enablePageSyntax) {
      return { success: false };
    }

    // Dispatch to specific module parser
    const moduleParseRule = getModuleRuleByName(openResult.moduleName);

    // Check for body based on module rule's hasBody flag
    // For unknown modules, default to no body (they will be parsed as bodyless)
    const bodyResult = parseModuleBody(ctx, openResult.pos, moduleParseRule?.hasBody ?? false);
    const consumed = openResult.consumed + bodyResult.consumed;

    if (moduleParseRule) {
      const result = moduleParseRule.parse(ctx, bodyResult.pos, openResult.attrs, bodyResult.body);

      return {
        success: true,
        elements: [moduleParseResultToElement(result)],
        consumed,
      };
    }

    return {
      success: true,
      elements: [createUnknownModuleElement(openResult.moduleName, openResult.attrs, bodyResult.body)],
      consumed,
    };
  },
};
