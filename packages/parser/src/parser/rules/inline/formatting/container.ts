import type { Element, StringContainerType } from "@wdprlib/ast";
import type { TokenType } from "../../../../lexer";
import type { ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { findFormattingClose, consumeFormattingClose } from "./close";
import { parseInlineUntil } from "../utils";

export function createInlineContainer(type: StringContainerType, elements: Element[]): Element {
  return {
    element: "container",
    data: {
      type,
      attributes: {},
      elements,
    },
  };
}

export function parseDelimitedContainer(
  ctx: ParseContext,
  closeToken: TokenType,
  type: StringContainerType,
  options: { discardEmpty?: boolean } = {},
): RuleResult<Element> {
  const startToken = currentToken(ctx);

  const close = findFormattingClose(ctx, ctx.pos + 1, closeToken);
  if (close === null) {
    return {
      success: true,
      elements: [{ element: "text", data: startToken.value }],
      consumed: 1,
    };
  }

  const result = parseInlineUntil({ ...ctx, pos: ctx.pos + 1 }, closeToken);
  const consumed =
    1 + result.consumed + consumeFormattingClose(ctx, close, ctx.pos + 1 + result.consumed);

  if (options.discardEmpty === true && result.elements.length === 0) {
    return {
      success: true,
      elements: [],
      consumed,
    };
  }

  return {
    success: true,
    elements: [createInlineContainer(type, result.elements)],
    consumed,
  };
}
