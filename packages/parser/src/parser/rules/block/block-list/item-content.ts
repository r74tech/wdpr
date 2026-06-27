import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { getCandidateInlineRules } from "../../inline/utils";
import { getCandidateBlockRules } from "../utils";
import { isLiOpen, isListClose, isNestedListOpen, type ListBlockType } from "./tags";

interface ListItemContentResult {
  matched: boolean;
  elements: Element[];
  consumed: number;
}

const blockListExcludedRulesCache = new WeakMap<
  ParseContext["blockRules"],
  ParseContext["blockRules"]
>();

export function parseListItemBlockContent(
  ctx: ParseContext,
  pos: number,
  token: ParseContext["tokens"][number],
): ListItemContentResult {
  const blockCtx: ParseContext = { ...ctx, pos };
  const filteredBlockRules = getBlockListExcludedRules(ctx.blockRules);

  for (const rule of getCandidateBlockRules(filteredBlockRules, token)) {
    const result = rule.parse(blockCtx);
    if (result.success) {
      return { matched: true, elements: result.elements, consumed: result.consumed };
    }
  }

  return { matched: false, elements: [], consumed: 0 };
}

function getBlockListExcludedRules(
  blockRules: ParseContext["blockRules"],
): ParseContext["blockRules"] {
  const cached = blockListExcludedRulesCache.get(blockRules);
  if (cached) {
    return cached;
  }

  const filtered = blockRules.filter((rule) => rule.name !== "block-list");
  blockListExcludedRulesCache.set(blockRules, filtered);
  return filtered;
}

export function parseListItemInlineContent(
  ctx: ParseContext,
  pos: number,
  tokenType: ParseContext["tokens"][number]["type"],
): ListItemContentResult {
  const inlineCtx: ParseContext = { ...ctx, pos };

  for (const rule of getCandidateInlineRules(ctx.inlineRules, tokenType)) {
    const result = rule.parse(inlineCtx);
    if (result.success) {
      return { matched: true, elements: result.elements, consumed: result.consumed };
    }
  }

  return { matched: false, elements: [], consumed: 0 };
}

export function collectPostLiTrailingContent(
  ctx: ParseContext,
  startPos: number,
  listType: ListBlockType,
): { elements: Element[]; consumed: number } {
  const elements: Element[] = [];
  let pos = startPos;
  let consumed = 0;

  while (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }
  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") break;

    if (token.type === "NEWLINE") {
      pos++;
      consumed++;
      while (ctx.tokens[pos]?.type === "NEWLINE") {
        pos++;
        consumed++;
      }
      while (ctx.tokens[pos]?.type === "WHITESPACE" && ctx.tokens[pos]?.lineStart) {
        pos++;
        consumed++;
      }
      if (isPostLiBoundary(ctx, pos, listType)) {
        break;
      }
      continue;
    }

    if (isPostLiBoundary(ctx, pos, listType)) {
      break;
    }

    const inlineResult = parseListItemInlineContent(ctx, pos, token.type);
    if (inlineResult.matched) {
      elements.push(...inlineResult.elements);
      consumed += inlineResult.consumed;
      pos += inlineResult.consumed;
      continue;
    }

    elements.push({ element: "text", data: token.value });
    consumed++;
    pos++;
  }

  return { elements, consumed };
}

function isPostLiBoundary(ctx: ParseContext, pos: number, listType: ListBlockType): boolean {
  return (
    isLiOpen(ctx, pos) !== null ||
    isListClose(ctx, pos, listType) ||
    isNestedListOpen(ctx, pos) !== null ||
    ctx.tokens[pos]?.type === "EOF"
  );
}
