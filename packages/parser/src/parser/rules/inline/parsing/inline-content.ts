import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import {
  collectLongPlainTextRun,
  MIN_INLINE_TEXT_RUN_DOCUMENT_TOKENS,
  type InlineEndType,
} from "./plain-text";
import { getParagraphNewlineBoundary } from "./paragraph-boundary";
import { createPreservedTrailingLineBreak } from "./preserved-line-break";
import { getCandidateInlineRules } from "./rules";
import { parseSimpleInlineToken } from "./simple-token";

/**
 * Result of parsing inline content.
 */
export interface InlineParseResult {
  elements: Element[];
  consumed: number;
}

/**
 * Parse inline content until a specific token type.
 *
 * When endType is "PARAGRAPH_BREAK", handles NEWLINEs and stops at:
 * - Double NEWLINE (paragraph break)
 * - NEWLINE followed by block-start token
 * - EOF
 */
export function parseInlineUntil(ctx: ParseContext, endType: InlineEndType): InlineParseResult {
  const nodes: Element[] = [];
  let consumed = 0;
  let pos = ctx.pos;

  const paragraphMode = endType === "PARAGRAPH_BREAK";
  const { inlineRules } = ctx;
  const inlineCtx: ParseContext = {
    ...ctx,
    pos,
  };
  const canCollectLongPlainTextRuns = ctx.tokens.length >= MIN_INLINE_TEXT_RUN_DOCUMENT_TOKENS;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    if (paragraphMode && ctx.scope.blockCloseCondition) {
      const checkCtx: ParseContext = { ...ctx, pos };
      if (ctx.scope.blockCloseCondition(checkCtx)) {
        break;
      }
    }

    if (!paragraphMode && token.type === "NEWLINE") {
      break;
    }

    if (paragraphMode && token.type === "NEWLINE") {
      const boundary = getParagraphNewlineBoundary(ctx, pos, nodes.length > 0);
      if (boundary.shouldBreak) {
        if (boundary.preservePrecedingLineBreak) {
          nodes.push(createPreservedTrailingLineBreak());
        }

        consumed += boundary.consumed;
        break;
      }
    }

    if (token.type === endType) {
      break;
    }

    if (canCollectLongPlainTextRuns) {
      const plainTextRun = collectLongPlainTextRun(ctx, pos, endType);
      if (plainTextRun) {
        nodes.push({ element: "text", data: plainTextRun.value });
        consumed += plainTextRun.consumed;
        pos += plainTextRun.consumed;
        continue;
      }
    }

    const simpleToken = parseSimpleInlineToken(token, ctx.tokens[pos + 1]);
    if (simpleToken) {
      nodes.push(simpleToken.element);
      consumed += simpleToken.consumed;
      pos += simpleToken.consumed;
      continue;
    }

    inlineCtx.pos = pos;

    let matched = false;
    for (const rule of getCandidateInlineRules(inlineRules, token.type)) {
      const result = rule.parse(inlineCtx);
      if (result.success) {
        nodes.push(...result.elements);
        consumed += result.consumed;
        pos += result.consumed;
        matched = true;
        break;
      }
    }

    if (!matched) {
      nodes.push({ element: "text", data: token.value });
      consumed++;
      pos++;
    }
  }

  return { elements: nodes, consumed };
}
