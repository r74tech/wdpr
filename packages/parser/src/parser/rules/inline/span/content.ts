import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { inlineRules } from "../../index";
import { getCandidateInlineRules } from "../utils";
import { consumeSpanNewline } from "./newline";
import { parseCloseSpan } from "./syntax";
import type { SpanBlockName } from "./syntax";

export interface SpanContent {
  children: Element[];
  escapedChildren: Element[];
  splitSpans: Element[][];
  consumed: number;
  foundClose: boolean;
}

export function parseSpanContent(
  ctx: ParseContext,
  startPos: number,
  blockName: SpanBlockName,
): SpanContent {
  const paragraphStrip = blockName === "span_";
  const children: Element[] = [];
  const escapedChildren: Element[] = [];
  const splitSpans: Element[][] = [];
  let foundClose = false;
  let afterBlankLine = false;
  let consumed = 0;
  let pos = startPos;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    const close = parseCloseSpan(ctx, pos);
    if (close.success) {
      pos += close.consumed;
      consumed += close.consumed;
      foundClose = true;
      break;
    }

    if (token.type === "NEWLINE") {
      const newline = consumeSpanNewline(
        ctx,
        pos,
        paragraphStrip,
        afterBlankLine,
        children,
        escapedChildren,
        splitSpans,
      );
      pos += newline.consumed;
      consumed += newline.consumed;
      afterBlankLine = afterBlankLine || newline.afterBlankLine;
      continue;
    }

    if (token.type === "WHITESPACE" && token.lineStart) {
      pos++;
      consumed++;
      continue;
    }

    const targetChildren = afterBlankLine ? escapedChildren : children;
    const parsed = parseOneSpanChild(ctx, pos, targetChildren);
    pos += parsed.consumed;
    consumed += parsed.consumed;
  }

  return { children, escapedChildren, splitSpans, consumed, foundClose };
}

function parseOneSpanChild(
  ctx: ParseContext,
  pos: number,
  targetChildren: Element[],
): { consumed: number } {
  const token = ctx.tokens[pos];
  if (!token) {
    return { consumed: 0 };
  }

  const inlineCtx: ParseContext = { ...ctx, pos };
  for (const rule of getCandidateInlineRules(inlineRules, token.type)) {
    const result = rule.parse(inlineCtx);
    if (result.success) {
      targetChildren.push(...result.elements);
      return { consumed: result.consumed };
    }
  }

  targetChildren.push({ element: "text", data: token.value });
  return { consumed: 1 };
}
