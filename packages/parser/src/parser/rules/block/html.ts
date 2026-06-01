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
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName, parseAttributesRaw } from "./utils";

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

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult || nameResult.name.toLowerCase() !== "html") {
      return { success: false };
    }
    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Parse attributes (type="css", style="...", etc.)
    // Only style attribute is used by Wikidot (applied to iframe)
    const attrResult = parseAttributesRaw(ctx, pos);
    pos += attrResult.consumed;
    consumed += attrResult.consumed;
    const style = attrResult.attrs.style;

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Settings-level gate: when `[[html]]` is disabled, still consume the
    // entire block so the raw body cannot leak as text, but produce no
    // AST element and skip the `ctx.htmlBlocks` push. The malformed
    // opener path above (missing `]]`) is intentionally not affected —
    // it falls through to text rendering as before.
    const disabled = ctx.settings.allowHtmlBlocks === false;

    // Collect HTML content until [[/html]]
    let contents = "";
    let foundClose = false;

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") break;

      // Check for closing [[/html]]
      if (token.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        if (closeNameResult?.name.toLowerCase() === "html") {
          foundClose = true;
          break;
        }
      }

      contents += token.value;
      pos++;
      consumed++;
    }

    // If no closing tag found:
    //  - enabled: fail (matches Wikidot fallback to text)
    //  - disabled: still consume to EOF so the body cannot leak, but emit
    //    both the unclosed warning and the disabled-info diagnostics.
    if (!foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/html]] for [[html]]",
        position: openToken.position,
      });
      if (!disabled) {
        return { success: false };
      }
      ctx.diagnostics.push({
        severity: "info",
        code: "html-block-disabled",
        message: "[[html]] block ignored: disabled by settings",
        position: openToken.position,
      });
      return { success: true, elements: [], consumed };
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

    if (disabled) {
      ctx.diagnostics.push({
        severity: "info",
        code: "html-block-disabled",
        message: "[[html]] block ignored: disabled by settings",
        position: openToken.position,
      });
      return { success: true, elements: [], consumed };
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
            ...(style && { style }),
          },
        },
      ],
      consumed,
    };
  },
};
