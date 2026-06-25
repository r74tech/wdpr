import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { currentToken } from "../../types";
import { collectExpressionText } from "./branch";
import { parseConditionalBranch } from "./conditional-branch";
import { MAX_EXPRESSION_LENGTH, parseExprOpener } from "./syntax";

export type ConditionalKeyword = "if" | "ifexpr";

export type ConditionalParseResult =
  | {
      success: true;
      head: string;
      thenElements: Element[];
      elseElements: Element[];
      consumed: number;
    }
  | { success: false };

export function parseConditional(
  ctx: ParseContext,
  keyword: ConditionalKeyword,
): ConditionalParseResult {
  if (currentToken(ctx).type !== "BLOCK_OPEN") {
    return { success: false };
  }

  const opener = parseExprOpener(ctx, keyword);
  if (!opener.success) {
    return { success: false };
  }

  let pos = opener.pos;
  let consumed = opener.consumed;

  const headResult = collectExpressionText(ctx, pos);
  if (!headResult.endedWithPipe || headResult.text.length > MAX_EXPRESSION_LENGTH) {
    return { success: false };
  }

  pos += headResult.consumed;
  consumed += headResult.consumed;

  if (ctx.tokens[pos]?.type !== "PIPE") {
    return { success: false };
  }
  pos++;
  consumed++;

  const thenResult = parseConditionalBranch(ctx, pos);
  pos = thenResult.nextPos;
  consumed += thenResult.consumed;

  let elseElements: Element[] = [];
  if (thenResult.endedWithPipe) {
    if (ctx.tokens[pos]?.type !== "PIPE") {
      return { success: false };
    }
    pos++;
    consumed++;

    const elseResult = parseConditionalBranch(ctx, pos);
    elseElements = elseResult.elements;
    pos = elseResult.nextPos;
    consumed += elseResult.consumed;
  }

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return { success: false };
  }
  consumed++;

  return {
    success: true,
    head: headResult.text,
    thenElements: thenResult.elements,
    elseElements,
    consumed,
  };
}
