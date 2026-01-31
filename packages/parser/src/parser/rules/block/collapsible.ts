import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName, parseBlocksUntil } from "./utils";

/**
 * Parse attributes allowing NEWLINEs between them (for multiline block syntax).
 * Stops at BLOCK_CLOSE or EOF.
 */
function parseMultilineAttributes(
  ctx: ParseContext,
  startPos: number,
): { attrs: Record<string, string>; consumed: number } {
  const attrs: Record<string, string> = {};
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "BLOCK_CLOSE" || token.type === "EOF") {
      break;
    }

    if (token.type === "WHITESPACE" || token.type === "NEWLINE") {
      pos++;
      consumed++;
      continue;
    }

    if (token.type === "TEXT" || token.type === "IDENTIFIER") {
      let name = token.value;
      pos++;
      consumed++;

      // Handle hyphenated names (e.g. "hide-location")
      while (
        ctx.tokens[pos]?.type === "TEXT" &&
        ctx.tokens[pos]?.value === "-" &&
        (ctx.tokens[pos + 1]?.type === "IDENTIFIER" || ctx.tokens[pos + 1]?.type === "TEXT")
      ) {
        name += "-";
        pos++;
        consumed++;
        name += ctx.tokens[pos]?.value ?? "";
        pos++;
        consumed++;
      }

      const eqToken = ctx.tokens[pos];
      if (eqToken?.type === "EQUALS") {
        pos++;
        consumed++;
        const valueToken = ctx.tokens[pos];
        if (valueToken?.type === "QUOTED_STRING") {
          let value = valueToken.value;
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          attrs[name] = value;
          pos++;
          consumed++;
        } else if (valueToken?.type === "TEXT" || valueToken?.type === "IDENTIFIER") {
          attrs[name] = valueToken.value;
          pos++;
          consumed++;
        }
      } else {
        attrs[name] = "true";
      }
    } else {
      // Unknown token type in attribute context, stop
      break;
    }
  }

  return { attrs, consumed };
}

/**
 * Check if tokens at the given position form [[/collapsible]]
 */
function isCollapsibleClose(ctx: ParseContext, pos: number): boolean {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") return false;
  const nameResult = parseBlockName(ctx, pos + 1);
  return nameResult?.name === "collapsible";
}

/**
 * Count tokens consumed by [[/collapsible]] (including optional trailing NEWLINE)
 */
function consumeCloseTag(ctx: ParseContext, pos: number): number {
  let closeConsumed = 1; // BLOCK_END_OPEN
  const nameResult = parseBlockName(ctx, pos + 1);
  if (nameResult) closeConsumed += nameResult.consumed;
  if (ctx.tokens[pos + closeConsumed]?.type === "BLOCK_CLOSE") closeConsumed++;
  if (ctx.tokens[pos + closeConsumed]?.type === "NEWLINE") closeConsumed++;
  return closeConsumed;
}

/**
 * Merge consecutive paragraph containers into a single paragraph.
 * When [[collapsible]] is disabled inside a collapsible body, the parser splits
 * content into multiple paragraphs at [[collapsible...]] tokens. Wikidot keeps
 * all content as one paragraph, so we merge them back together with line-breaks.
 */
function mergeParagraphs(elements: Element[]): Element[] {
  const result: Element[] = [];
  let mergedElements: Element[] = [];

  for (const elem of elements) {
    if (
      elem.element === "container" &&
      elem.data &&
      typeof elem.data === "object" &&
      "type" in elem.data &&
      elem.data.type === "paragraph"
    ) {
      // Add line-break between merged paragraphs
      if (mergedElements.length > 0) {
        mergedElements.push({ element: "line-break" });
      }
      if ("elements" in elem.data && Array.isArray(elem.data.elements)) {
        mergedElements.push(...elem.data.elements);
      }
    } else {
      // Non-paragraph element: flush merged paragraphs
      if (mergedElements.length > 0) {
        result.push({
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: mergedElements,
          },
        });
        mergedElements = [];
      }
      result.push(elem);
    }
  }

  // Flush remaining merged paragraphs
  if (mergedElements.length > 0) {
    result.push({
      element: "container",
      data: {
        type: "paragraph",
        attributes: {},
        elements: mergedElements,
      },
    });
  }

  return result;
}

export const collapsibleRule: BlockRule = {
  name: "collapsible",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult || nameResult.name !== "collapsible") {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    const attrResult = parseMultilineAttributes(ctx, pos);
    pos += attrResult.consumed;
    consumed += attrResult.consumed;

    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    const hasNewlineAfterOpen = ctx.tokens[pos]?.type === "NEWLINE";
    if (hasNewlineAfterOpen) {
      pos++;
      consumed++;
    }

    let bodyElements: Element[];

    if (
      !hasNewlineAfterOpen &&
      ctx.tokens[pos]?.type !== "EOF" &&
      ctx.tokens[pos]?.type !== "BLOCK_END_OPEN"
    ) {
      // Inline form: [[collapsible]]content[[/collapsible]] on same line
      // Parse inline content until [[/collapsible]] or NEWLINE
      const inlineElements: Element[] = [];
      let inlineConsumed = 0;
      let inlinePos = pos;

      while (inlinePos < ctx.tokens.length) {
        const token = ctx.tokens[inlinePos];
        if (!token || token.type === "EOF" || token.type === "NEWLINE") break;
        if (isCollapsibleClose(ctx, inlinePos)) break;
        inlineElements.push({ element: "text", data: token.value });
        inlinePos++;
        inlineConsumed++;
      }

      consumed += inlineConsumed;
      pos += inlineConsumed;

      if (inlineElements.length > 0) {
        bodyElements = [
          {
            element: "container",
            data: {
              type: "paragraph",
              attributes: {},
              elements: inlineElements,
            },
          },
        ];
      } else {
        bodyElements = [];
      }
    } else {
      // Block form: parse content recursively until [[/collapsible]]
      // Collapsible cannot be nested in Wikidot - nested [[collapsible]] becomes plain text
      const bodyCtx: ParseContext = {
        ...ctx,
        pos,
        blockRules: ctx.blockRules.filter((r) => r.name !== "collapsible"),
      };

      const closeCondition = (checkCtx: ParseContext): boolean => {
        return isCollapsibleClose(checkCtx, checkCtx.pos);
      };

      const bodyResult = parseBlocksUntil(bodyCtx, closeCondition);
      consumed += bodyResult.consumed;
      pos += bodyResult.consumed;

      // Merge consecutive paragraphs into one (Wikidot doesn't split paragraphs
      // at unrecognized [[block]] tokens inside collapsible)
      bodyElements = mergeParagraphs(bodyResult.elements);
    }

    // Consume [[/collapsible]]
    if (isCollapsibleClose(ctx, pos)) {
      const closeConsumed = consumeCloseTag(ctx, pos);
      consumed += closeConsumed;
      pos += closeConsumed;
    }

    // Consume orphaned [[/collapsible]] after the block
    // Wikidot renders these as bare <br />[[/collapsible]] (no <p> wrapper)
    const orphanedElements: Element[] = [];
    while (isCollapsibleClose(ctx, pos)) {
      orphanedElements.push({ element: "line-break" });

      // Convert tokens of [[/collapsible]] to text
      while (pos < ctx.tokens.length) {
        const t = ctx.tokens[pos];
        if (!t || t.type === "NEWLINE" || t.type === "EOF") break;
        orphanedElements.push({ element: "text", data: t.value });
        consumed++;
        pos++;
      }

      // Skip trailing NEWLINE
      if (ctx.tokens[pos]?.type === "NEWLINE") {
        consumed++;
        pos++;
      }
    }

    // Determine show-top/show-bottom from hideLocation attribute
    const hideLocation = (
      attrResult.attrs.hideLocation ??
      attrResult.attrs.hidelocation ??
      "top"
    ).toLowerCase();
    let showTop = true;
    let showBottom = false;
    if (hideLocation === "both") {
      showTop = true;
      showBottom = true;
    } else if (hideLocation === "bottom") {
      showTop = false;
      showBottom = true;
    } else if (hideLocation === "neither" || hideLocation === "none") {
      showTop = false;
      showBottom = false;
    }

    return {
      success: true,
      elements: [
        {
          element: "collapsible",
          data: {
            elements: bodyElements,
            attributes: {},
            "start-open": attrResult.attrs.folded === "no",
            "show-text": attrResult.attrs.show ?? null,
            "hide-text": attrResult.attrs.hide ?? null,
            "show-top": showTop,
            "show-bottom": showBottom,
          },
        },
        ...orphanedElements,
      ],
      consumed,
    };
  },
};
