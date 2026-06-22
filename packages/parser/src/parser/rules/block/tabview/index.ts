/**
 *
 * Block rule for Wikidot tabbed content: `[[tabview]]` (or `[[tabs]]`).
 *
 * A tabview contains one or more `[[tab Label]]...[[/tab]]` blocks:
 *
 * ```
 * [[tabview]]
 * [[tab First Tab]]
 * Content of the first tab.
 * [[/tab]]
 * [[tab Second Tab]]
 * Content of the second tab.
 * [[/tab]]
 * [[/tabview]]
 * ```
 *
 * Key behaviours:
 * - Both `[[tabview]]` and `[[tabs]]` are accepted as the outer wrapper.
 * - Any attributes or text after the block name on the opening tag are
 *   silently ignored (Wikidot behaviour: `[[tabview Foo]]` is valid).
 * - If a tab has no label, it defaults to `"untitled"`.
 * - Tab body content is parsed as block-level markup.
 * - An empty tabview (no tabs) fails the rule, falling back to text.
 * - Non-tab content between tabs (other than whitespace/newlines) causes
 *   the rule to fail.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { collectTabviewBody } from "./body";
import { parseTabviewOpen } from "./open";

/**
 * Block rule for `[[tabview]]`/`[[tabs]]` with `[[tab]]` children.
 */
export const tabviewRule: BlockRule = {
  name: "tabview",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const openResult = parseTabviewOpen(ctx, ctx.pos);
    if (!openResult) {
      return { success: false };
    }

    const bodyResult = collectTabviewBody(ctx, ctx.pos + openResult.consumed);
    let consumed = openResult.consumed + bodyResult.consumed;

    if (bodyResult.invalidContent) {
      return { success: false };
    }

    if (!bodyResult.foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: `Missing closing tag [[/${openResult.blockName}]] for [[${openResult.blockName}]]`,
        position: openToken.position,
      });
    }

    if (bodyResult.closeConsumed > 0) {
      consumed += bodyResult.closeConsumed;
    }

    if (bodyResult.tabs.length === 0) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "tab-view",
          data: bodyResult.tabs,
        },
      ],
      consumed,
    };
  },
};
