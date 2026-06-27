import type { ListItem } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { getCandidateInlineRules } from "../../inline/utils";
import {
  appendBareParagraphElements,
  appendBareParagraphLineBreakIfNeeded,
  appendBareParagraphText,
  createBareParagraphState,
  flushBareParagraph,
  unwrapSingleBareParagraph,
} from "./bare-paragraph";
import { isLiOpen, isListClose, isNestedListOpen, type ListBlockType } from "./tags";

export interface BareListContentResult {
  item: ListItem | null;
  consumed: number;
}

export function parseBareListContent(
  ctx: ParseContext,
  startPos: number,
  listType: ListBlockType,
): BareListContentResult {
  const paragraphState = createBareParagraphState();
  let consumed = 0;
  let pos = startPos;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") break;

    if (token.type === "NEWLINE") {
      pos++;
      consumed++;

      let consecutiveNewlines = 1;
      while (ctx.tokens[pos]?.type === "NEWLINE") {
        pos++;
        consumed++;
        consecutiveNewlines++;
      }

      while (ctx.tokens[pos]?.type === "WHITESPACE" && ctx.tokens[pos]?.lineStart) {
        pos++;
        consumed++;
      }

      if (isListBoundary(ctx, pos, listType)) {
        break;
      }

      if (consecutiveNewlines >= 2) {
        flushBareParagraph(paragraphState);
      } else {
        appendBareParagraphLineBreakIfNeeded(paragraphState);
      }
      continue;
    }

    if (isListBoundary(ctx, pos, listType)) {
      break;
    }

    let matched = false;
    const inlineCtx: ParseContext = { ...ctx, pos };
    for (const rule of getCandidateInlineRules(ctx.inlineRules, token.type)) {
      const result = rule.parse(inlineCtx);
      if (result.success) {
        appendBareParagraphElements(paragraphState, result.elements);
        consumed += result.consumed;
        pos += result.consumed;
        matched = true;
        break;
      }
    }

    if (!matched) {
      appendBareParagraphText(paragraphState, token.value);
      consumed++;
      pos++;
    }
  }

  flushBareParagraph(paragraphState);
  if (paragraphState.paragraphs.length === 0) {
    return { item: null, consumed };
  }

  return {
    item: {
      "item-type": "elements",
      attributes: { _noMarker: "true" },
      elements: unwrapSingleBareParagraph(paragraphState.paragraphs),
    },
    consumed,
  };
}

function isListBoundary(ctx: ParseContext, pos: number, listType: ListBlockType): boolean {
  return (
    isListClose(ctx, pos, listType) ||
    isLiOpen(ctx, pos) !== null ||
    isNestedListOpen(ctx, pos) !== null
  );
}
