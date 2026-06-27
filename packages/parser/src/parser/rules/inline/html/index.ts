/**
 *
 * Inline-position gate for `[[html]]...[[/html]]` when the parser is
 * configured with `allowHtmlBlocks: false`.
 *
 * The block-level {@link htmlBlockRule} already removes `[[html]]` blocks
 * that sit at the start of a line, but the block dispatcher never
 * reaches a `[[html]]` that appears mid-paragraph. Without this inline
 * rule, the body of a disabled-but-inline-positioned `[[html]]` would
 * end up parsed as paragraph text and leak into the output as escaped
 * HTML.
 *
 * When enabled (`allowHtmlBlocks !== false`), the rule does nothing
 * (returns `success: false`) so the existing paragraph behaviour is
 * preserved: a stray inline `[[html]]` renders as text. The block-level
 * rule handles the proper case where `[[html]]` is on its own line.
 *
 * When disabled (`allowHtmlBlocks === false`):
 * - A well-formed `[[html ...]]...[[/html]]` is fully consumed and
 *   produces no AST element, emitting an `html-block-disabled` info
 *   diagnostic.
 * - An unclosed `[[html ...]]` is consumed to the end of the token
 *   stream so the body cannot leak as inline text, emitting both
 *   `unclosed-block` (warning) and `html-block-disabled` (info).
 *
 * @module
 */

import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { consumeDisabledHtmlBody } from "./gate";
import { parseHtmlInlineOpen } from "./open";

/**
 * Inline rule that gates `[[html]]` when the setting disallows it.
 */
export const htmlInlineRule: InlineRule = {
  name: "html",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const openResult = parseHtmlInlineOpen(ctx);
    if (!openResult) {
      return { success: false };
    }

    // Enabled: leave inline `[[html]]` alone — it falls through to text
    // rendering, matching the historical behaviour for stray block-named
    // openers used inline.
    if (ctx.settings.allowHtmlBlocks !== false) {
      return { success: false };
    }

    const bodyResult = consumeDisabledHtmlBody(ctx, openResult.bodyStart);
    const consumed = openResult.consumed + bodyResult.consumed;

    if (!bodyResult.foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/html]] for [[html]]",
        position: openToken.position,
      });
    }

    ctx.diagnostics.push({
      severity: "info",
      code: "html-block-disabled",
      message: "[[html]] block ignored: disabled by settings",
      position: openToken.position,
    });

    return { success: true, elements: [], consumed };
  },
};
