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
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseBlockName } from "../utils";
import { collectIftagsCondition } from "./condition";
import { consumeIftagsClose, isIftagsClose, parseIftagsBody } from "./body";

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

    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult || nameResult.name.toLowerCase() !== "iftags") {
      return { success: false };
    }
    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    const conditionResult = collectIftagsCondition(ctx, pos);
    pos += conditionResult.consumed;
    consumed += conditionResult.consumed;

    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    const bodyResult = parseIftagsBody(ctx, pos);
    pos += bodyResult.consumed;
    consumed += bodyResult.consumed;

    if (!isIftagsClose(ctx, pos)) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/iftags]] for [[iftags]]",
        position: openToken.position,
      });
    } else {
      const closeConsumed = consumeIftagsClose(ctx, pos);
      pos += closeConsumed;
      consumed += closeConsumed;
    }

    return {
      success: true,
      elements: [
        {
          element: "if-tags",
          data: {
            condition: conditionResult.condition.trim(),
            elements: bodyResult.elements,
          },
        },
      ],
      consumed,
    };
  },
};
