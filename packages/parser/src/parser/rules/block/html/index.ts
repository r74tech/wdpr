/**
 *
 * Block rule for the Wikidot HTML block: `[[html]]...[[/html]]`.
 *
 * An HTML block embeds raw HTML that Wikidot renders inside a sandboxed
 * `<iframe>`. The content between the tags is captured verbatim (no inline
 * parsing) and stored as an `html` element in the AST.
 *
 * Supported attributes on the opening tag:
 * - `style` -- applied to the containing iframe. Other attributes are
 *   parsed but only `style` is used by Wikidot's renderer.
 *
 * The raw content is also pushed into `ctx.htmlBlocks` for document-level
 * enumeration.
 *
 * If no `[[/html]]` closing tag is found, the rule fails and the opening
 * tag falls through to text rendering (matching Wikidot behaviour).
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { collectHtmlBody, consumeHtmlClose } from "./body";
import { addHtmlDisabledDiagnostic } from "./diagnostics";
import { parseHtmlOpen } from "./open";

export { lookaheadHasHtmlClose } from "./body";

/**
 * Block rule for `[[html]]...[[/html]]`.
 *
 * Body content is stored as raw text. The optional `style` attribute is
 * passed through to the AST element for iframe styling.
 */
export const htmlBlockRule: BlockRule = {
  name: "html",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const openResult = parseHtmlOpen(ctx, ctx.pos);
    if (!openResult) {
      return { success: false };
    }

    const disabled = ctx.settings.allowHtmlBlocks === false;
    const bodyStart = ctx.pos + openResult.consumed;
    const bodyResult = collectHtmlBody(ctx, bodyStart, disabled);
    let consumed = openResult.consumed + bodyResult.consumed;

    if (!bodyResult.foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/html]] for [[html]]",
        position: openToken.position,
      });
      if (!disabled) {
        return { success: false };
      }
      addHtmlDisabledDiagnostic(ctx, openToken.position);
      return { success: true, elements: [], consumed };
    }

    consumed += consumeHtmlClose(ctx, bodyStart + bodyResult.consumed);

    if (disabled) {
      addHtmlDisabledDiagnostic(ctx, openToken.position);
      return { success: true, elements: [], consumed };
    }

    const contents = bodyResult.contents.trim();
    ctx.htmlBlocks.push(contents);

    return {
      success: true,
      elements: [
        {
          element: "html",
          data: {
            contents,
            ...(openResult.style && { style: openResult.style }),
          },
        },
      ],
      consumed,
    };
  },
};
