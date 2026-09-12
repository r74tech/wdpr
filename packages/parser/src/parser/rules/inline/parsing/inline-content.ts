import { stripAutomaticLineBreak } from "./automatic-line-break";
import { parseDateSyntax } from "../date/syntax";
import { emailRegionEnd } from "../email/candidates";
import { protectedInlineRegionEnd } from "../raw/end";
import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import {
  collectLongPlainTextRun,
  MIN_INLINE_TEXT_RUN_DOCUMENT_TOKENS,
  type InlineEndType,
} from "./plain-text";
import { getParagraphNewlineBoundary } from "./paragraph-boundary";
import {
  createPreservedLeadingLineBreak,
  createPreservedTrailingLineBreak,
} from "./preserved-line-break";
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
  let consumedEmptyRaw = false;

  const paragraphMode = endType === "PARAGRAPH_BREAK";
  const multiline = paragraphMode || FORMATTING_CLOSE_TOKENS.has(endType);
  let inlineEnd = ctx.scope.inlineEnd ?? ctx.tokens.length;
  if (!multiline) {
    for (let end = ctx.pos; end < inlineEnd; end++) {
      const protectedEnd = Math.max(
        parseDateSyntax(ctx, end, inlineEnd)?.end ?? end,
        emailRegionEnd(ctx.tokens, end, inlineEnd),
        protectedInlineRegionEnd(ctx.tokens, end, inlineEnd),
      );
      if (protectedEnd > end) {
        end = protectedEnd - 1;
        continue;
      }
      if (
        ctx.tokens[end]?.type === "NEWLINE" &&
        ctx.tokens[end - 1]?.type === "UNDERSCORE" &&
        ctx.tokens[end - 2]?.type === "WHITESPACE"
      )
        continue;
      if (ctx.tokens[end]?.type === "NEWLINE" || ctx.tokens[end]?.type === endType) {
        inlineEnd = end;
        break;
      }
    }
  }
  const { inlineRules } = ctx;
  const inlineCtx: ParseContext = {
    ...ctx,
    pos,
    scope: { ...ctx.scope, inlineEnd },
  };
  const canCollectLongPlainTextRuns = ctx.tokens.length >= MIN_INLINE_TEXT_RUN_DOCUMENT_TOKENS;

  while (pos < inlineEnd) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    if (ctx.scope.blockCloseCondition) {
      const checkCtx: ParseContext = { ...ctx, pos };
      if (ctx.scope.blockCloseCondition(checkCtx)) {
        break;
      }
    }

    if (!multiline && token.type === "NEWLINE") {
      break;
    }

    if (multiline && token.type === "NEWLINE" && !ctx.scope.tableFormatting) {
      const boundary = getParagraphNewlineBoundary(ctx, pos, nodes.length > 0);
      if (boundary.shouldBreak) {
        if (boundary.preservePrecedingLineBreak) {
          nodes.push(createPreservedTrailingLineBreak());
        }

        consumed += boundary.consumed;
        break;
      }
    }

    if (ctx.scope.tableFormatting?.suppressedClosers.has(pos)) {
      pos++;
      consumed++;
      continue;
    }

    const hasEmail = emailRegionEnd(ctx.tokens, pos, inlineEnd) > pos;
    if (token.type === endType && !hasEmail) {
      break;
    }

    if (canCollectLongPlainTextRuns && !hasEmail) {
      const plainTextRun = collectLongPlainTextRun(ctx, pos, endType);
      if (plainTextRun) {
        nodes.push({ element: "text", data: plainTextRun.value });
        consumed += plainTextRun.consumed;
        pos += plainTextRun.consumed;
        continue;
      }
    }

    const simpleToken = parseSimpleInlineToken(token, ctx.tokens[pos + 1]);
    if (simpleToken && !hasEmail) {
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
        stripAutomaticLineBreak(nodes, result.stripLeadingLineBreak);
        if (rule.name === "raw" && result.elements.length === 0 && nodes.length === 0) {
          consumedEmptyRaw = true;
        }
        if (rule.name === "comment") {
          let after = pos + result.consumed;
          while (ctx.tokens[after]?.type === "WHITESPACE") after++;
          if (ctx.tokens[after]?.type === "NEWLINE" || ctx.tokens[after]?.type === "EOF") {
            while (nodes.at(-1)?.element === "text") {
              const last = nodes.at(-1)!;
              if (last.element !== "text") break;
              last.data = last.data.trimEnd();
              if (last.data) break;
              nodes.pop();
            }
            if (nodes.at(-1)?.element === "line-break") nodes.pop();
          }
        }
        for (const element of result.elements) {
          nodes.push(
            paragraphMode &&
              consumedEmptyRaw &&
              nodes.length === 0 &&
              token.type === "NEWLINE" &&
              element.element === "line-break"
              ? createPreservedLeadingLineBreak()
              : element,
          );
        }
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

const FORMATTING_CLOSE_TOKENS: ReadonlySet<string> = new Set([
  "BOLD_MARKER",
  "ITALIC_MARKER",
  "UNDERLINE_MARKER",
  "STRIKE_MARKER",
  "SUPER_MARKER",
  "SUB_MARKER",
  "MONO_CLOSE",
  "COLOR_MARKER",
]);
