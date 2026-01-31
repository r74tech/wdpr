import type { Token } from "../../../lexer";
import type { Element } from "@wdprlib/ast";
import type { ParseContext, BlockRule } from "../types";
import { canApplyInlineRule } from "../inline/utils";
import { filterUnsafeAttributes, parseBlockName } from "../utils";

// Re-export for backwards compatibility
export { filterUnsafeAttributes, parseBlockName } from "../utils";

/**
 * Result of parsing block content
 */
export interface BlockParseResult {
  elements: Element[];
  consumed: number;
}

/**
 * Check if a block rule can be applied
 */
export function canApplyBlockRule(rule: BlockRule, token: Token): boolean {
  if (rule.requiresLineStart && !token.lineStart) {
    return false;
  }
  if (rule.startTokens.length === 0) {
    return true; // fallback rule
  }
  return rule.startTokens.includes(token.type);
}

/**
 * Parse block elements until close condition is met
 */
export function parseBlocksUntil(
  ctx: ParseContext,
  closeCondition: (ctx: ParseContext) => boolean,
): BlockParseResult {
  const elements: Element[] = [];
  let consumed = 0;
  let pos = ctx.pos;

  const { blockRules, blockFallbackRule } = ctx;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    // Check close condition
    const checkCtx: ParseContext = { ...ctx, pos };
    if (closeCondition(checkCtx)) {
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

    // Try each block rule
    let matched = false;
    // Pass close condition to context so paragraph parser can respect it
    const blockCtx: ParseContext = { ...ctx, pos, blockCloseCondition: closeCondition };

    for (const rule of blockRules) {
      if (canApplyBlockRule(rule, token)) {
        const result = rule.parse(blockCtx);
        if (result.success) {
          elements.push(...result.elements);
          consumed += result.consumed;
          pos += result.consumed;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Fallback to paragraph
      const result = blockFallbackRule.parse(blockCtx);
      if (result.success && result.elements.length > 0) {
        elements.push(...result.elements);
        consumed += result.consumed;
        pos += result.consumed;
      } else {
        // Skip token to avoid infinite loop
        pos++;
        consumed++;
      }
    }
  }

  return { elements, consumed };
}

/**
 * Parse mixed content until close condition is met (no paragraph wrapping)
 * Used for div_ (paragraph strip mode)
 * Newlines become line-breaks, paragraph breaks become double line-breaks
 * Block elements (like nested div) are returned as-is (mixed into inline stream)
 */
export function parseInlineContentUntil(
  ctx: ParseContext,
  closeCondition: (ctx: ParseContext) => boolean,
): BlockParseResult {
  const elements: Element[] = [];
  let consumed = 0;
  let pos = ctx.pos;

  const { blockRules, inlineRules } = ctx;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    // Check close condition
    const checkCtx: ParseContext = { ...ctx, pos };
    if (closeCondition(checkCtx)) {
      break;
    }

    // Skip whitespace at beginning of lines (but not between words)
    if (token.type === "WHITESPACE" && token.lineStart) {
      pos++;
      consumed++;
      continue;
    }

    // Handle newlines - convert to line-breaks
    // In paragraph strip mode, blank lines (double newline) become single line-break
    // But newlines before block elements are not converted to line-breaks
    if (token.type === "NEWLINE") {
      pos++;
      consumed++;
      // Skip additional blank lines
      while (ctx.tokens[pos]?.type === "NEWLINE") {
        pos++;
        consumed++;
      }

      // Check if next token starts a block element (BLOCK_OPEN, BLOCK_END_OPEN)
      // If so, don't add line-break - the newline just separates text from block
      const nextToken = ctx.tokens[pos];
      if (
        nextToken?.type === "BLOCK_OPEN" ||
        nextToken?.type === "BLOCK_END_OPEN" ||
        nextToken?.type === "EOF" ||
        !nextToken
      ) {
        continue;
      }

      // Otherwise, add line-break
      elements.push({ element: "line-break" });
      continue;
    }

    // Try block rules first (for nested div, collapsible, etc.)
    // In paragraph strip mode, blocks are mixed into the inline stream
    let matched = false;
    const blockCtx: ParseContext = { ...ctx, pos };

    for (const rule of blockRules) {
      if (canApplyBlockRule(rule, token)) {
        const result = rule.parse(blockCtx);
        if (result.success) {
          // Add block elements directly (mixed into inline stream)
          elements.push(...result.elements);
          consumed += result.consumed;
          pos += result.consumed;
          matched = true;
          break;
        }
      }
    }

    if (matched) continue;

    // Try each inline rule
    const inlineCtx: ParseContext = { ...ctx, pos };

    for (const rule of inlineRules) {
      if (canApplyInlineRule(rule, token)) {
        const result = rule.parse(inlineCtx);
        if (result.success) {
          elements.push(...result.elements);
          consumed += result.consumed;
          pos += result.consumed;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Fallback to text
      elements.push({ element: "text", data: token.value });
      consumed++;
      pos++;
    }
  }

  // Remove trailing line-breaks
  while (elements.length > 0 && elements[elements.length - 1]?.element === "line-break") {
    elements.pop();
  }

  return { elements, consumed };
}

/**
 * Parse attributes from tokens like: id="foo" class="bar" data-custom="value"
 * Handles hyphenated attribute names like data-paragraph
 */
export function parseAttributes(
  ctx: ParseContext,
  startPos: number,
): { attrs: Record<string, string>; consumed: number } {
  const attrs: Record<string, string> = {};
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "BLOCK_CLOSE" ||
      token.type === "NEWLINE" ||
      token.type === "EOF"
    ) {
      break;
    }

    // Skip whitespace
    if (token.type === "WHITESPACE") {
      pos++;
      consumed++;
      continue;
    }

    // Attribute name (TEXT or IDENTIFIER token)
    // May include hyphens like "data-paragraph" which tokenizes as: IDENTIFIER "data", TEXT "-", IDENTIFIER "paragraph"
    if (token.type === "TEXT" || token.type === "IDENTIFIER") {
      let name = token.value;
      pos++;
      consumed++;

      // Collect hyphenated parts (e.g., data-paragraph, aria-label)
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

      // Normalize attribute name to lowercase (Wikidot is case-insensitive)
      name = name.toLowerCase();

      // Check for =
      const eqToken = ctx.tokens[pos];
      if (eqToken?.type === "EQUALS") {
        pos++;
        consumed++;

        // Get value (quoted string or text)
        const valueToken = ctx.tokens[pos];
        if (valueToken?.type === "QUOTED_STRING") {
          // Remove quotes
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
        // Boolean attribute
        attrs[name] = "true";
      }
    } else {
      // Unknown token, skip
      pos++;
      consumed++;
    }
  }

  return { attrs: filterUnsafeAttributes(attrs), consumed };
}

/**
 * Parse attributes without safety filtering.
 * Use this for block-specific parameters that are not HTML attributes.
 * @param hyphenatedNames - If true, handles hyphenated attribute names like data-paragraph (default: true)
 */
export function parseAttributesRaw(
  ctx: ParseContext,
  startPos: number,
  hyphenatedNames = true,
): { attrs: Record<string, string>; consumed: number } {
  const attrs: Record<string, string> = {};
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "BLOCK_CLOSE" ||
      token.type === "NEWLINE" ||
      token.type === "EOF"
    ) {
      break;
    }

    if (token.type === "WHITESPACE") {
      pos++;
      consumed++;
      continue;
    }

    if (token.type === "TEXT" || token.type === "IDENTIFIER") {
      let name = token.value;
      pos++;
      consumed++;

      // Handle hyphenated attribute names (e.g., data-paragraph, aria-label)
      // When hyphenatedNames=true: collect full name (data-paragraph)
      // When hyphenatedNames=false: skip hyphen parts, use first segment only (data)
      // This prevents data-src from becoming separate "data" and "src" attributes
      // Also handles STRIKE_MARKER (--) and multiple hyphens (----, etc.)
      const isHyphen = (t: (typeof ctx.tokens)[0] | undefined) =>
        (t?.type === "TEXT" && t.value === "-") || t?.type === "STRIKE_MARKER";
      const isNamePart = (t: (typeof ctx.tokens)[0] | undefined) =>
        t?.type === "IDENTIFIER" || t?.type === "TEXT";

      while (isHyphen(ctx.tokens[pos])) {
        // Skip consecutive hyphens first
        while (isHyphen(ctx.tokens[pos])) {
          if (hyphenatedNames) {
            name += ctx.tokens[pos]?.value ?? "-";
          }
          pos++;
          consumed++;
        }
        // Then check if followed by name part
        if (isNamePart(ctx.tokens[pos])) {
          if (hyphenatedNames) {
            name += ctx.tokens[pos]?.value ?? "";
          }
          pos++;
          consumed++;
        } else {
          // No name part after hyphens, stop
          break;
        }
      }

      // Normalize attribute name to lowercase (Wikidot is case-insensitive)
      name = name.toLowerCase();

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
      pos++;
      consumed++;
    }
  }

  return { attrs, consumed };
}

/**
 * Create a close condition for block end tags like [[/name]]
 */
export function createBlockEndCondition(
  blockNames: string[],
): (ctx: ParseContext) => { matched: boolean; consumed: number } {
  return (ctx: ParseContext) => {
    const token = ctx.tokens[ctx.pos];
    if (token?.type !== "BLOCK_END_OPEN") {
      return { matched: false, consumed: 0 };
    }

    const nameResult = parseBlockName(ctx, ctx.pos + 1);
    if (!nameResult) {
      return { matched: false, consumed: 0 };
    }

    if (!blockNames.includes(nameResult.name)) {
      return { matched: false, consumed: 0 };
    }

    // Calculate consumed: [[/ + name + ]]
    let consumed = 1 + nameResult.consumed;

    // Check for closing ]]
    const closePos = ctx.pos + 1 + nameResult.consumed;
    if (ctx.tokens[closePos]?.type === "BLOCK_CLOSE") {
      consumed++;
    }

    // Check for trailing newline
    const newlinePos = closePos + 1;
    if (ctx.tokens[newlinePos]?.type === "NEWLINE") {
      consumed++;
    }

    return { matched: true, consumed };
  };
}
