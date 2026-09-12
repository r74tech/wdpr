import { stripAutomaticLineBreak } from "../parsing/automatic-line-break";
import { rawRegionEnd } from "../raw/end";
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
  let forcedClose = false;
  let afterBlankLine = false;
  let consumed = 0;
  let pos = startPos;

  while (pos < (ctx.scope.inlineEnd ?? ctx.tokens.length)) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    if (ctx.scope.tableFormatting?.suppressedClosers.has(pos)) {
      forcedClose = true;
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

  if (!foundClose && ctx.scope.tableFormatting && (pos === ctx.scope.inlineEnd || forcedClose)) {
    let depth = 0;
    for (let next = pos; next < ctx.scope.tableFormatting.end; next++) {
      const rawEnd = rawRegionEnd(ctx.tokens, next, ctx.scope.tableFormatting.end);
      if (rawEnd > next) {
        next = rawEnd - 1;
        continue;
      }
      if (
        ctx.tokens[next]?.type === "BLOCK_OPEN" &&
        /^span_?$/i.test(ctx.tokens[next + 1]?.value ?? "")
      )
        depth++;
      const close = parseCloseSpan(ctx, next);
      if (!close.success) continue;
      if (depth > 0) {
        depth--;
        continue;
      }
      for (let offset = 0; offset < close.consumed; offset++)
        ctx.scope.tableFormatting.suppressedClosers.add(next + offset);
      foundClose = true;
      break;
    }
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
      stripAutomaticLineBreak(targetChildren, result.stripLeadingLineBreak);
      for (const element of result.elements) targetChildren.push(element);
      return { consumed: result.consumed };
    }
  }

  targetChildren.push({ element: "text", data: token.value });
  return { consumed: 1 };
}
