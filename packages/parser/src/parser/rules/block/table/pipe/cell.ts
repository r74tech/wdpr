import { protectedInlineRegionEnd } from "../../../inline/raw/end";
import type { Element, TableCell } from "@wdprlib/ast";
import type { ParseContext } from "../../../types";
import { getCandidateInlineRules } from "../../../inline/utils";
import type { CellStart } from "./cell-start";
import { isPipeTableToken } from "./tokens";
import { trimElements } from "./trim";

export function parseTableCell(
  ctx: ParseContext,
  startPos: number,
  cellStart: CellStart,
): { cell: TableCell; consumed: number; terminatedProperly: boolean } {
  let pos = startPos;
  let consumed = 0;
  const children: Element[] = [];

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const { inlineRules } = ctx;
  let inlineEnd = pos;
  while (inlineEnd < ctx.tokens.length) {
    const rawEnd = protectedInlineRegionEnd(ctx.tokens, inlineEnd, ctx.tokens.length);
    if (rawEnd > inlineEnd) {
      inlineEnd = rawEnd;
      continue;
    }
    const token = ctx.tokens[inlineEnd];
    if (!token || token.type === "EOF" || token.type === "NEWLINE" || isPipeTableToken(token.type))
      break;
    if (
      token.type === "WHITESPACE" &&
      ctx.tokens[inlineEnd + 1]?.type === "UNDERSCORE" &&
      ctx.tokens[inlineEnd + 2]?.type === "NEWLINE"
    )
      inlineEnd += 3;
    else inlineEnd++;
  }
  const inlineCtx: ParseContext = {
    ...ctx,
    pos,
    scope: {
      ...ctx.scope,
      inlineEnd,
      tableFormatting: isPipeTableToken(ctx.tokens[inlineEnd]?.type ?? "EOF")
        ? ctx.scope.tableFormatting
        : undefined,
    },
  };

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      break;
    }
    if (isPipeTableToken(token.type)) {
      break;
    }

    if (ctx.scope.tableFormatting?.suppressedClosers.has(pos)) {
      pos++;
      consumed++;
      continue;
    }

    if (tryConsumeUnderscoreLineBreak(ctx, pos, children)) {
      pos += 3;
      consumed += 3;
      continue;
    }

    if (token.type === "WHITESPACE") {
      children.push({ element: "text", data: token.value });
      pos++;
      consumed++;
      continue;
    }

    inlineCtx.pos = pos;
    let matched = false;

    for (const rule of getCandidateInlineRules(inlineRules, token.type)) {
      const result = rule.parse(inlineCtx);
      if (result.success) {
        for (const element of result.elements) children.push(element);
        consumed += result.consumed;
        pos += result.consumed;
        matched = true;
        break;
      }
    }

    if (!matched) {
      children.push({ element: "text", data: token.value });
      consumed++;
      pos++;
    }
  }

  const currentToken = ctx.tokens[pos];
  const terminatedProperly = currentToken ? isPipeTableToken(currentToken.type) : false;

  return {
    cell: {
      header: cellStart.header,
      "column-span": cellStart.colspan,
      align: terminatedProperly ? (cellStart.align ?? null) : null,
      attributes: {},
      elements: terminatedProperly ? trimElements(children) : [],
    },
    consumed,
    terminatedProperly,
  };
}

function tryConsumeUnderscoreLineBreak(
  ctx: ParseContext,
  pos: number,
  children: Element[],
): boolean {
  const token = ctx.tokens[pos];
  if (token?.type !== "WHITESPACE") {
    return false;
  }

  const nextTok = ctx.tokens[pos + 1];
  const afterTok = ctx.tokens[pos + 2];
  if (
    nextTok?.type === "UNDERSCORE" &&
    afterTok &&
    (afterTok.type === "NEWLINE" || afterTok.type === "EOF")
  ) {
    children.push({ element: "line-break" });
    return true;
  }

  return false;
}
