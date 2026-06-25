import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { getCandidateInlineRules } from "../utils";
import { advanceExprDepth } from "./depth";

export interface BranchParseResult {
  elements: Element[];
  consumed: number;
  endedWithPipe: boolean;
}

export interface ExpressionTextResult {
  text: string;
  consumed: number;
  endedWithPipe: boolean;
}

/**
 * Parses inline content for the then/else branches of `[[#if]]` and `[[#ifexpr]]`.
 */
export function parseInlineBranch(ctx: ParseContext, startPos: number): BranchParseResult {
  const elements: Element[] = [];
  let consumed = 0;
  let pos = startPos;
  let depth = 0;

  const { inlineRules } = ctx;
  const inlineCtx: ParseContext = { ...ctx, pos };

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF" || token.type === "NEWLINE") {
      break;
    }

    const nextDepth = advanceExprDepth(token, depth);
    if (nextDepth.shouldBreak) {
      break;
    }
    depth = nextDepth.depth;

    if (token.type === "PIPE" && depth === 0) {
      return { elements, consumed, endedWithPipe: true };
    }

    inlineCtx.pos = pos;
    let matched = false;

    for (const rule of getCandidateInlineRules(inlineRules, token.type)) {
      if (rule.startTokens.includes("PIPE") || rule.startTokens.includes("BLOCK_CLOSE")) {
        continue;
      }
      const result = rule.parse(inlineCtx);
      if (result.success) {
        elements.push(...result.elements);
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

  return { elements, consumed, endedWithPipe: false };
}

/**
 * Collects raw text for the expression or condition portion of expr rules.
 */
export function collectExpressionText(ctx: ParseContext, startPos: number): ExpressionTextResult {
  const parts: string[] = [];
  let consumed = 0;
  let pos = startPos;
  let depth = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF" || token.type === "NEWLINE") {
      break;
    }

    const nextDepth = advanceExprDepth(token, depth);
    if (nextDepth.shouldBreak) {
      break;
    }
    depth = nextDepth.depth;

    if (token.type === "PIPE" && depth === 0) {
      return { text: parts.join("").trim(), consumed, endedWithPipe: true };
    }

    parts.push(token.value);
    consumed++;
    pos++;
  }

  return { text: parts.join("").trim(), consumed, endedWithPipe: false };
}
