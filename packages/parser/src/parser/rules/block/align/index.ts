/**
 *
 * Block rule for Wikidot alignment containers.
 *
 * Wikidot provides a shorthand bracket syntax for wrapping content in a
 * directional alignment container:
 *
 * ```
 * [[>]]        ... [[/>]]        right-aligned
 * [[<]]        ... [[/<]]        left-aligned
 * [[=]]        ... [[/=]]        center-aligned
 * [[==]]       ... [[/==]]       justify-aligned
 * ```
 *
 * Each pair acts as a block-level wrapper. The opening tag must appear at
 * the start of a line and be followed by a newline. Body content is parsed
 * recursively as block-level markup, and the matching closing tag terminates
 * the container.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseAlignBody } from "./body";
import { createAlignElement } from "./element";
import { alignDirectionSymbol, parseAlignOpen } from "./syntax";

/**
 * Block rule that matches Wikidot directional alignment containers.
 *
 * `preservesPrecedingLineBreak` is `true` because, unlike most block
 * constructs, an alignment block does not suppress a preceding `\n` from
 * becoming a `<br />` in Wikidot's output.
 */
export const alignRule: BlockRule = {
  name: "align",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: true,
  preservesPrecedingLineBreak: true,

  isStartPattern(ctx: ParseContext, pos: number): boolean {
    if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") return false;
    return parseAlignOpen(ctx, pos + 1) !== null;
  },

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    const alignResult = parseAlignOpen(ctx, pos);
    if (!alignResult) {
      return { success: false };
    }

    const { direction } = alignResult;
    pos += alignResult.consumed;
    consumed += alignResult.consumed;

    if (ctx.tokens[pos]?.type !== "NEWLINE") {
      return { success: false };
    }
    pos++;
    consumed++;

    const bodyResult = parseAlignBody(ctx, pos, direction);
    consumed += bodyResult.consumed;

    if (!bodyResult.foundClose) {
      const directionSymbol = alignDirectionSymbol(direction);
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: `Missing closing tag [[/${directionSymbol}]] for [[${directionSymbol}]]`,
        position: openToken.position,
      });
    }

    return {
      success: true,
      elements: [createAlignElement(direction, bodyResult.elements)],
      consumed,
    };
  },
};
