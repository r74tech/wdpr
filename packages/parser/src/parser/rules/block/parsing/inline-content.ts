import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { getCandidateInlineRules } from "../../inline/utils";
import type { BlockParseResult } from "./content";
import { consumeInlineContentNewlines, removeTrailingLineBreaks } from "./inline-newline";
import { getCandidateBlockRules } from "./rule-dispatch";

/**
 * Parses mixed inline/block content until a close condition is met,
 * WITHOUT paragraph wrapping.
 *
 * This is used for `div_` (paragraph strip mode) where newlines become
 * `<br />` elements rather than paragraph separators. Blank lines
 * (multiple consecutive newlines) are collapsed into a single `<br />`.
 *
 * Block-level elements (nested div, collapsible, etc.) are mixed directly
 * into the inline element stream. Newlines immediately before a BLOCK_OPEN
 * or BLOCK_END_OPEN are silently consumed (no `<br />` generated).
 *
 * Trailing line-break elements are stripped from the result.
 *
 * @param ctx            - Parse context positioned at the start of the body.
 * @param closeCondition - Predicate that signals the end of the content.
 * @returns Parsed elements and total tokens consumed.
 */
export function parseInlineContentUntil(
  ctx: ParseContext,
  closeCondition: (ctx: ParseContext) => boolean,
): BlockParseResult {
  const elements: Element[] = [];
  let consumed = 0;
  let pos = ctx.pos;

  const { blockRules, inlineRules } = ctx;
  const checkCtx: ParseContext = { ...ctx, pos };
  const blockCtx: ParseContext = { ...ctx, pos };
  const inlineCtx: ParseContext = { ...ctx, pos };

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    checkCtx.pos = pos;
    if (closeCondition(checkCtx)) {
      break;
    }

    if (token.type === "WHITESPACE" && token.lineStart) {
      pos++;
      consumed++;
      continue;
    }

    if (token.type === "NEWLINE") {
      const newlineResult = consumeInlineContentNewlines(ctx, pos);
      consumed += newlineResult.consumed;
      pos += newlineResult.consumed;
      if (newlineResult.addLineBreak) {
        elements.push({ element: "line-break" });
      }
      continue;
    }

    let matched = false;
    blockCtx.pos = pos;

    for (const rule of getCandidateBlockRules(blockRules, token)) {
      const result = rule.parse(blockCtx);
      if (result.success) {
        for (const element of result.elements) elements.push(element);
        consumed += result.consumed;
        pos += result.consumed;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    inlineCtx.pos = pos;

    for (const rule of getCandidateInlineRules(inlineRules, token.type)) {
      const result = rule.parse(inlineCtx);
      if (result.success) {
        for (const element of result.elements) elements.push(element);
        consumed += result.consumed;
        pos += result.consumed;
        matched = true;
        break;
      }
    }

    if (!matched) {
      elements.push({ element: "text", data: token.value });
      consumed++;
      pos++;
    }
  }

  removeTrailingLineBreaks(elements);

  return { elements, consumed };
}
