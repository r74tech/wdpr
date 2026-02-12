/**
 *
 * Block rule for Wikidot conditional tag blocks: `[[iftags]]...[[/iftags]]`.
 *
 * The `[[iftags]]` construct conditionally includes or excludes its body
 * content based on the page's tags. The condition expression is everything
 * between the block name and `]]`, e.g.:
 *
 * ```
 * [[iftags +scp -tale]]
 * This content only shows if the page has tag "scp" and not "tale".
 * [[/iftags]]
 * ```
 *
 * The condition string is stored as-is in the AST; actual evaluation is
 * performed at render time based on the page's tag set.
 *
 * Body content is parsed as normal block-level markup using
 * {@link parseBlocksUntil}.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName, parseBlocksUntil } from "./utils";

/**
 * Block rule for `[[iftags condition]]...[[/iftags]]`.
 *
 * Produces an `if-tags` element containing the condition string and
 * the parsed body elements.
 */
export const iftagsRule: BlockRule = {
  name: "iftags",
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
    if (!nameResult || nameResult.name.toLowerCase() !== "iftags") {
      return { success: false };
    }
    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse condition (tag expressions)
    let condition = "";
    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "BLOCK_CLOSE" || token.type === "NEWLINE") {
        break;
      }
      condition += token.value;
      pos++;
      consumed++;
    }

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip newline after opening tag
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    // Close condition for [[/iftags]]
    const closeCondition = (checkCtx: ParseContext): boolean => {
      const token = checkCtx.tokens[checkCtx.pos];
      if (token?.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(checkCtx, checkCtx.pos + 1);
        if (closeNameResult?.name.toLowerCase() === "iftags") {
          return true;
        }
      }
      return false;
    };

    // Parse body
    const bodyCtx: ParseContext = { ...ctx, pos };
    const bodyResult = parseBlocksUntil(bodyCtx, closeCondition);
    consumed += bodyResult.consumed;
    pos += bodyResult.consumed;

    // Check for missing close tag
    if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/iftags]] for [[iftags]]",
        position: openToken.position,
      });
    }

    // Consume [[/iftags]]
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

    condition = condition.trim();

    return {
      success: true,
      elements: [
        {
          element: "if-tags",
          data: {
            condition,
            elements: bodyResult.elements,
          },
        },
      ],
      consumed,
    };
  },
};
