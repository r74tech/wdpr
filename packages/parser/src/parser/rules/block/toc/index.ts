/**
 * Table of contents rule: [[toc]], [[f<toc ...]], [[f>toc ...]]
 *
 * Variants:
 * - [[toc]] - basic TOC
 * - [[f<toc ...]] - float left
 * - [[f>toc ...]] - float right
 *
 * Note: Wikidot ignores attributes on [[toc]] (class, style, id are not applied)
 * [[>toc]] and [[<toc]] are invalid in Wikidot and not supported.
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { createTocElement } from "./element";
import { parseTocOpen } from "./open";

export const tocRule: BlockRule = {
  name: "toc",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    if (!ctx.settings.enablePageSyntax) {
      return { success: false };
    }

    const openResult = parseTocOpen(ctx, ctx.pos);
    if (!openResult) {
      return { success: false };
    }

    return {
      success: true,
      elements: [createTocElement(openResult.align)],
      consumed: openResult.consumed,
    };
  },
};
