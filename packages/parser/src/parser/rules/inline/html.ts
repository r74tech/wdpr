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
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName, parseAttributesRaw } from "../block/utils";
import { lookaheadHasHtmlClose } from "../block/html";

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

    let pos = ctx.pos + 1;
    let consumed = 1;

    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult || nameResult.name.toLowerCase() !== "html") {
      return { success: false };
    }
    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    const attrResult = parseAttributesRaw(ctx, pos);
    pos += attrResult.consumed;
    consumed += attrResult.consumed;

    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Enabled: leave inline `[[html]]` alone — it falls through to text
    // rendering, matching the historical behaviour for stray block-named
    // openers used inline.
    if (ctx.settings.allowHtmlBlocks !== false) {
      return { success: false };
    }

    // Disabled path: consume the body until a real `[[/html]]` (BLOCK_END_OPEN
    // + name + BLOCK_CLOSE, allowing whitespace inside the close tag).
    // Only allow the blank-line stop when no real close exists ahead, so
    // a closed body that spans paragraphs is still consumed correctly.
    const hasCloseAhead = lookaheadHasHtmlClose(ctx, pos);
    let foundClose = false;
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") break;

      // Stop at a blank line so an unclosed inline `[[html]]` does not
      // swallow subsequent paragraphs.
      if (!hasCloseAhead && token.type === "NEWLINE" && ctx.tokens[pos + 1]?.type === "NEWLINE") {
        break;
      }

      if (token.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        if (closeNameResult?.name.toLowerCase() === "html") {
          let checkPos = pos + 1 + closeNameResult.consumed;
          while (ctx.tokens[checkPos]?.type === "WHITESPACE") checkPos++;
          if (ctx.tokens[checkPos]?.type === "BLOCK_CLOSE") {
            foundClose = true;
            // Consume `[[/html]]` (and optional trailing newline) too.
            consumed += checkPos - pos + 1;
            pos = checkPos + 1;
            if (ctx.tokens[pos]?.type === "NEWLINE") {
              pos++;
              consumed++;
            }
            break;
          }
        }
      }

      pos++;
      consumed++;
    }

    if (!foundClose) {
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
