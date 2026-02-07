/**
 *
 * Shared utilities used by block-level parser rules.
 *
 * This module provides the core building blocks that most block rules
 * depend on:
 *
 * - {@link canApplyBlockRule} -- fast pre-check for whether a rule's start
 *   tokens match the current token.
 * - {@link parseBlocksUntil} -- the main block-level content parser that
 *   iterates rules until a close condition is met (used by div, collapsible,
 *   tabview, iftags, align, etc.).
 * - {@link parseInlineContentUntil} -- similar to `parseBlocksUntil` but
 *   without paragraph wrapping, used for `div_` paragraph-strip mode.
 * - {@link parseAttributes} / {@link parseAttributesRaw} -- attribute
 *   parsers for block opening tags (with and without safety filtering).
 * - {@link createBlockEndCondition} -- factory for close-condition predicates.
 *
 * Re-exports {@link filterUnsafeAttributes} and {@link parseBlockName} from
 * the shared `../utils` module for backward compatibility.
 *
 * @module
 */
import type { Token } from "../../../lexer";
import type { Element } from "@wdprlib/ast";
import type { ParseContext, BlockRule } from "../types";
import { canApplyInlineRule } from "../inline/utils";
import { filterUnsafeAttributes, parseBlockName } from "../utils";

// Re-export for backwards compatibility
export { filterUnsafeAttributes, parseBlockName } from "../utils";

/**
 * Result of parsing a sequence of block-level content.
 */
export interface BlockParseResult {
  /** The parsed AST elements. */
  elements: Element[];
  /** Total number of tokens consumed from the stream. */
  consumed: number;
}

/**
 * Determines whether a block rule is eligible for the current token.
 *
 * A rule is eligible if:
 * 1. The token is at line start (when `rule.requiresLineStart` is true).
 * 2. The token's type is in the rule's `startTokens` list (or the list
 *    is empty, meaning the rule is a universal fallback).
 *
 * @param rule  - The block rule to check.
 * @param token - The current token.
 * @returns `true` if the rule may be attempted.
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
 * Parses block-level elements from the token stream until a close
 * condition is satisfied.
 *
 * This is the workhorse parser used by container blocks (div, collapsible,
 * tabview, iftags, align, etc.) to parse their body content. It loops
 * through tokens, trying each block rule in priority order, and falls back
 * to the paragraph rule when nothing else matches.
 *
 * Whitespace and newline tokens between blocks are silently consumed.
 * The close condition receives a ParseContext snapshot at the current
 * position and should return `true` to stop parsing (the close tag
 * itself is NOT consumed here -- the caller handles that).
 *
 * The close condition is also injected into `blockCloseCondition` on
 * the context so that the paragraph parser can respect the enclosing
 * block's boundary.
 *
 * @param ctx            - Parse context positioned at the start of the body.
 * @param closeCondition - Predicate that signals the end of the block body.
 * @returns Parsed elements and total tokens consumed.
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
 * Parses HTML-style attributes from block opening tags.
 *
 * Supports:
 * - `name="value"` (quoted string)
 * - `name=value` (unquoted single-token value)
 * - `name` (boolean attribute, stored as `"true"`)
 * - Hyphenated names like `data-paragraph` or `aria-label` (composed
 *   from TEXT `-` IDENTIFIER token sequences).
 *
 * Attribute names are lowercased (Wikidot is case-insensitive).
 * The result is filtered through {@link filterUnsafeAttributes} to strip
 * potentially dangerous attributes (e.g. `onload`, `onclick`).
 *
 * Stops at BLOCK_CLOSE, NEWLINE, or EOF.
 *
 * @param ctx      - Parse context.
 * @param startPos - Token index to begin scanning.
 * @returns Parsed (filtered) attributes and total tokens consumed.
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
 * Parses attributes from block opening tags WITHOUT safety filtering.
 *
 * Use this for block-specific parameters (like `type` on `[[code]]`) that
 * are not emitted as HTML attributes and therefore do not need XSS
 * protection. The parsing logic is identical to {@link parseAttributes}
 * except the result is returned as-is.
 *
 * Hyphenated name handling is configurable because some contexts (e.g.
 * code block with `data-src`) should treat hyphens as part of the name,
 * while others should not.
 *
 * Also handles STRIKE_MARKER tokens (`--`) in attribute name positions,
 * which can appear when a double hyphen is used in names like
 * `data--something`.
 *
 * @param ctx             - Parse context.
 * @param startPos        - Token index to begin scanning.
 * @param hyphenatedNames - When `true` (default), hyphens are collected
 *                          into the attribute name. When `false`, only
 *                          the first segment before a hyphen is used.
 * @returns Parsed (unfiltered) attributes and total tokens consumed.
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
 * Creates a reusable close-condition function that matches block end tags
 * (`[[/name]]`) for one or more block names.
 *
 * The returned function inspects the tokens at `ctx.pos` and returns both
 * whether a match was found and how many tokens the closing tag occupies
 * (including the optional trailing NEWLINE).
 *
 * @param blockNames - Array of block names to match (e.g. `["div"]`).
 * @returns A function suitable for use as a `closeCondition` argument,
 *          returning `{ matched, consumed }`.
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
