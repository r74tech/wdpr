import type { Element, ListData, ListItem } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName, parseAttributes, canApplyBlockRule } from "./utils";

/**
 * Block list rule for [[ul]]/[[ol]]/[[li]] syntax
 *
 * Wikidot supports block-based list syntax:
 * [[ul]]
 *   [[li]]Item 1[[/li]]
 *   [[li]]Item 2[[/li]]
 * [[/ul]]
 *
 * This syntax supports attributes on both lists and items:
 * [[ul class="custom-list"]]
 *   [[li class="item"]]Content[[/li]]
 * [[/ul]]
 */

type ListBlockType = "ul" | "ol";

/**
 * Check if the next tokens form [[/ul]] or [[/ol]] close tag
 */
function isListClose(ctx: ParseContext, pos: number, expectedType?: ListBlockType): boolean {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") return false;
  const nameResult = parseBlockName(ctx, pos + 1);
  if (!nameResult) return false;
  const name = nameResult.name;
  if (expectedType) {
    return name === expectedType;
  }
  return name === "ul" || name === "ol";
}

/**
 * Check if the next tokens form [[/li]] close tag
 */
function isLiClose(ctx: ParseContext, pos: number): boolean {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") return false;
  const nameResult = parseBlockName(ctx, pos + 1);
  return nameResult?.name === "li";
}

/**
 * Check if the next tokens form [[li]] open tag
 * Note: [[li_]] is NOT recognized by Wikidot and treated as text
 */
function isLiOpen(ctx: ParseContext, pos: number): { name: string; consumed: number } | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") return null;
  const nameResult = parseBlockName(ctx, pos + 1);
  if (!nameResult) return null;
  // Only "li" is valid, not "li_" (Wikidot doesn't recognize li_)
  if (nameResult.name === "li") {
    return { name: nameResult.name, consumed: 1 + nameResult.consumed };
  }
  return null;
}

/**
 * Check if the next tokens form [[ul]] or [[ol]] open tag (for nested lists)
 */
function isNestedListOpen(
  ctx: ParseContext,
  pos: number,
): { type: ListBlockType; consumed: number } | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") return null;
  const nameResult = parseBlockName(ctx, pos + 1);
  if (!nameResult) return null;
  if (nameResult.name === "ul" || nameResult.name === "ol") {
    return { type: nameResult.name as ListBlockType, consumed: 1 + nameResult.consumed };
  }
  return null;
}

/**
 * Consume close tag tokens [[/name]] and optional trailing newline
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
 * Parse a single [[li]] ... [[/li]] item
 */
function parseLiItem(
  ctx: ParseContext,
  startPos: number,
  listType: ListBlockType,
): { item: ListItem | Element; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  // Check for [[li]] open
  const liOpen = isLiOpen(ctx, pos);
  if (!liOpen) return null;

  pos += liOpen.consumed;
  consumed += liOpen.consumed;

  // Parse attributes
  const attrResult = parseAttributes(ctx, pos);
  pos += attrResult.consumed;
  consumed += attrResult.consumed;

  // Expect ]]
  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }
  pos++;
  consumed++;

  // Optional newline after [[li ...]]
  const hasNewlineAfterOpen = ctx.tokens[pos]?.type === "NEWLINE";
  if (hasNewlineAfterOpen) {
    pos++;
    consumed++;
  }

  // Parse content until [[/li]] or [[ul]]/[[ol]] (nested list)
  const contentElements: Element[] = [];

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") break;

    // Check for [[/li]] close
    if (isLiClose(ctx, pos)) {
      break;
    }

    // Check for [[/ul]] or [[/ol]] - unclosed li
    if (isListClose(ctx, pos, listType)) {
      break;
    }

    // Check for nested [[ul]] or [[ol]]
    const nestedListOpen = isNestedListOpen(ctx, pos);
    if (nestedListOpen) {
      const nestedResult = parseListBlock(ctx, pos, nestedListOpen.type);
      if (nestedResult) {
        // Add nested list directly to contentElements (maintains order)
        contentElements.push(nestedResult.element);
        // Wikidot adds <br /> after nested lists inside li
        contentElements.push({ element: "line-break" });
        consumed += nestedResult.consumed;
        pos += nestedResult.consumed;
        continue;
      }
    }

    // Skip whitespace at beginning of lines
    if (token.type === "WHITESPACE" && token.lineStart) {
      pos++;
      consumed++;
      continue;
    }

    // Handle newlines
    if (token.type === "NEWLINE") {
      pos++;
      consumed++;
      // Check if next line starts with [[/li]] or nested list
      // Count consecutive newlines
      let consecutiveNewlines = 1;
      while (ctx.tokens[pos]?.type === "NEWLINE") {
        pos++;
        consumed++;
        consecutiveNewlines++;
      }
      // Skip leading whitespace
      while (ctx.tokens[pos]?.type === "WHITESPACE" && ctx.tokens[pos]?.lineStart) {
        pos++;
        consumed++;
      }
      // Wikidot behavior:
      // - Single newline followed by content or [[/li]] → <br />
      // - Multiple newlines (paragraph break) → no <br />
      // - Need content before this newline
      const atCloseTag =
        isLiClose(ctx, pos) || isListClose(ctx, pos, listType) || ctx.tokens[pos]?.type === "EOF";
      if (consecutiveNewlines === 1 && contentElements.length > 0) {
        // Single newline with content before - add line-break
        // (Even before [[/li]], Wikidot adds <br /> for the trailing newline)
        contentElements.push({ element: "line-break" });
      }
      if (atCloseTag) {
        continue;
      }
      continue;
    }

    // Try block rules first (for div, etc. inside li)
    let matched = false;
    const blockCtx: ParseContext = { ...ctx, pos };

    // Filter out block-list rule to avoid infinite recursion
    const filteredBlockRules = ctx.blockRules.filter((r) => r.name !== "block-list");
    for (const rule of filteredBlockRules) {
      if (canApplyBlockRule(rule, token)) {
        const result = rule.parse(blockCtx);
        if (result.success) {
          contentElements.push(...result.elements);
          consumed += result.consumed;
          pos += result.consumed;
          matched = true;
          break;
        }
      }
    }

    if (matched) continue;

    // Try inline rules
    const inlineCtx: ParseContext = { ...ctx, pos };
    for (const rule of ctx.inlineRules) {
      if (rule.startTokens.includes(token.type)) {
        const result = rule.parse(inlineCtx);
        if (result.success) {
          contentElements.push(...result.elements);
          consumed += result.consumed;
          pos += result.consumed;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Fallback to text
      contentElements.push({ element: "text", data: token.value });
      consumed++;
      pos++;
    }
  }

  // Consume [[/li]] if present
  if (isLiClose(ctx, pos)) {
    const closeConsumed = consumeCloseTag(ctx, pos);
    consumed += closeConsumed;
    pos += closeConsumed;

    // Wikidot behavior: content after [[/li]] but before next [[li]] or [[/ul]]/[[/ol]]
    // is included in the same <li> element
    // Skip newlines first
    while (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }
    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Collect trailing content until next [[li]], [[/ul]], [[/ol]], or EOF
    while (pos < ctx.tokens.length) {
      const tok = ctx.tokens[pos];
      if (!tok || tok.type === "EOF") break;
      if (tok.type === "NEWLINE") {
        pos++;
        consumed++;
        // Skip consecutive newlines
        while (ctx.tokens[pos]?.type === "NEWLINE") {
          pos++;
          consumed++;
        }
        // Skip whitespace
        while (ctx.tokens[pos]?.type === "WHITESPACE" && ctx.tokens[pos]?.lineStart) {
          pos++;
          consumed++;
        }
        // Check for end conditions
        if (
          isLiOpen(ctx, pos) ||
          isListClose(ctx, pos, listType) ||
          isNestedListOpen(ctx, pos) ||
          ctx.tokens[pos]?.type === "EOF"
        ) {
          break;
        }
        continue;
      }
      if (isLiOpen(ctx, pos) || isListClose(ctx, pos, listType) || isNestedListOpen(ctx, pos)) {
        break;
      }
      // Parse inline content for trailing
      let matched = false;
      const inlineCtx: ParseContext = { ...ctx, pos };
      for (const rule of ctx.inlineRules) {
        if (rule.startTokens.includes(tok.type)) {
          const result = rule.parse(inlineCtx);
          if (result.success) {
            contentElements.push(...result.elements);
            consumed += result.consumed;
            pos += result.consumed;
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        contentElements.push({ element: "text", data: tok.value });
        consumed++;
        pos++;
      }
    }
  }

  // Regular list item with content (may include nested list as element)
  return {
    item: {
      "item-type": "elements",
      attributes: attrResult.attrs,
      elements: contentElements,
    } as ListItem,
    consumed,
  };
}

/**
 * Parse a [[ul]] or [[ol]] block
 */
function parseListBlock(
  ctx: ParseContext,
  startPos: number,
  listType: ListBlockType,
): { element: Element; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  // Skip [[ul or [[ol
  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") return null;
  pos++;
  consumed++;

  // Parse block name
  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || (nameResult.name !== "ul" && nameResult.name !== "ol")) {
    return null;
  }
  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  // Parse attributes
  const attrResult = parseAttributes(ctx, pos);
  pos += attrResult.consumed;
  consumed += attrResult.consumed;

  // Expect ]]
  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }
  pos++;
  consumed++;

  // Wikidot: [[ul]] must be followed by newline to be recognized
  // Exception: inline form [[ul]][[li]]...[[/li]][[/ul]] on same line is valid
  const hasNewlineAfterOpen = ctx.tokens[pos]?.type === "NEWLINE";
  if (hasNewlineAfterOpen) {
    pos++;
    consumed++;
  }

  // Parse list items
  const items: ListItem[] = [];

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") break;

    // Check for [[/ul]] or [[/ol]] close
    if (isListClose(ctx, pos, listType)) {
      const closeConsumed = consumeCloseTag(ctx, pos);
      consumed += closeConsumed;
      break;
    }

    // Skip whitespace
    if (token.type === "WHITESPACE") {
      pos++;
      consumed++;
      continue;
    }

    // Skip newlines
    if (token.type === "NEWLINE") {
      pos++;
      consumed++;
      continue;
    }

    // Check for nested [[ul]] or [[ol]] without [[li]] wrapper
    const nestedListOpen = isNestedListOpen(ctx, pos);
    if (nestedListOpen) {
      const nestedResult = parseListBlock(ctx, pos, nestedListOpen.type);
      if (nestedResult && nestedResult.element.element === "list") {
        const listData = nestedResult.element.data as ListData;
        items.push({
          "item-type": "sub-list",
          element: "list",
          data: listData,
        });
        consumed += nestedResult.consumed;
        pos += nestedResult.consumed;
        continue;
      }
    }

    // Try to parse [[li]] item
    const liResult = parseLiItem(ctx, pos, listType);
    if (liResult) {
      if ("item-type" in liResult.item) {
        items.push(liResult.item as ListItem);
      }
      consumed += liResult.consumed;
      pos += liResult.consumed;
      continue;
    }

    // Wikidot behavior: bare content inside [[ul]]/[[ol]] (without [[li]])
    // is wrapped in <li style="list-style: none">
    // Empty lines create paragraph breaks within the bare content
    // Collect content until [[/ul]], [[/ol]], [[li]], or [[ul]]/[[ol]]
    const bareContent: Element[] = [];
    let currentParagraph: Element[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        // Trim trailing line-breaks from paragraph
        while (
          currentParagraph.length > 0 &&
          currentParagraph[currentParagraph.length - 1]?.element === "line-break"
        ) {
          currentParagraph.pop();
        }
        if (currentParagraph.length > 0) {
          bareContent.push({
            element: "container",
            data: {
              type: "paragraph",
              attributes: {},
              elements: currentParagraph,
            },
          });
        }
        currentParagraph = [];
      }
    };

    while (pos < ctx.tokens.length) {
      const tok = ctx.tokens[pos];
      if (!tok || tok.type === "EOF") break;
      if (tok.type === "NEWLINE") {
        pos++;
        consumed++;
        // Count consecutive newlines
        let consecutiveNewlines = 1;
        while (ctx.tokens[pos]?.type === "NEWLINE") {
          pos++;
          consumed++;
          consecutiveNewlines++;
        }
        // Skip leading whitespace
        while (ctx.tokens[pos]?.type === "WHITESPACE" && ctx.tokens[pos]?.lineStart) {
          pos++;
          consumed++;
        }
        // Check if next meaningful token is a close tag or li open
        if (
          isListClose(ctx, pos, listType) ||
          isLiOpen(ctx, pos) ||
          isNestedListOpen(ctx, pos)
        ) {
          break;
        }
        // Multiple newlines = paragraph break
        if (consecutiveNewlines >= 2) {
          flushParagraph();
        } else if (currentParagraph.length > 0) {
          // Single newline = line break
          currentParagraph.push({ element: "line-break" });
        }
        continue;
      }
      if (isListClose(ctx, pos, listType) || isLiOpen(ctx, pos) || isNestedListOpen(ctx, pos)) {
        break;
      }
      // Parse inline content
      let matched = false;
      const inlineCtx: ParseContext = { ...ctx, pos };
      for (const rule of ctx.inlineRules) {
        if (rule.startTokens.includes(tok.type)) {
          const result = rule.parse(inlineCtx);
          if (result.success) {
            currentParagraph.push(...result.elements);
            consumed += result.consumed;
            pos += result.consumed;
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        currentParagraph.push({ element: "text", data: tok.value });
        consumed++;
        pos++;
      }
    }
    // Flush remaining content
    flushParagraph();
    if (bareContent.length > 0) {
      // Wikidot behavior: if there's only one paragraph, unwrap it
      // Only use <p> tags when there are multiple paragraphs
      let finalElements: Element[];
      if (
        bareContent.length === 1 &&
        bareContent[0]?.element === "container" &&
        (bareContent[0] as { data?: { type?: string } }).data?.type === "paragraph"
      ) {
        // Single paragraph - unwrap
        finalElements = (bareContent[0] as { data: { elements: Element[] } }).data.elements;
      } else {
        finalElements = bareContent;
      }
      items.push({
        "item-type": "elements",
        attributes: { _noMarker: "true" }, // Flag for list-style: none
        elements: finalElements,
      });
    }
  }

  const listData: ListData = {
    type: listType === "ol" ? "numbered" : "bullet",
    attributes: attrResult.attrs,
    items,
  };

  return {
    element: {
      element: "list",
      data: listData,
    },
    consumed,
  };
}

export const blockListRule: BlockRule = {
  name: "block-list",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    // Check for [[ul or [[ol
    const nameResult = parseBlockName(ctx, ctx.pos + 1);
    if (!nameResult || (nameResult.name !== "ul" && nameResult.name !== "ol")) {
      return { success: false };
    }

    const listType = nameResult.name as ListBlockType;
    const result = parseListBlock(ctx, ctx.pos, listType);

    if (!result) {
      return { success: false };
    }

    // Wikidot adds <br /> after block lists
    return {
      success: true,
      elements: [result.element, { element: "line-break" }],
      consumed: result.consumed,
    };
  },
};
