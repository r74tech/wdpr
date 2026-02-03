import type { TokenType, Token } from "../../../lexer";
import type { Element } from "@wdprlib/ast";
import type { ParseContext, InlineRule } from "../types";
import { BLOCK_START_TOKENS } from "../../constants";

/**
 * Result of parsing inline content
 */
export interface InlineParseResult {
  elements: Element[];
  consumed: number;
}

/**
 * Check if an inline rule can be applied
 */
export function canApplyInlineRule(rule: InlineRule, token: { type: TokenType }): boolean {
  if (rule.startTokens.length === 0) {
    return true; // fallback rule
  }
  return rule.startTokens.includes(token.type);
}

/**
 * Parse inline content until a specific token type
 *
 * When endType is "PARAGRAPH_BREAK", handles NEWLINEs and stops at:
 * - Double NEWLINE (paragraph break)
 * - NEWLINE followed by block-start token
 * - EOF
 */
export function parseInlineUntil(ctx: ParseContext, endType: TokenType): InlineParseResult {
  const nodes: Element[] = [];
  let consumed = 0;
  let pos = ctx.pos;

  // Check if we're in paragraph mode (handle NEWLINEs inline)
  const paragraphMode = endType === ("PARAGRAPH_BREAK" as TokenType);

  const { inlineRules } = ctx;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    // Stop at block close condition if set in context
    // This allows paragraph parser to respect parent block's close condition
    if (paragraphMode && ctx.blockCloseCondition) {
      const checkCtx: ParseContext = { ...ctx, pos };
      if (ctx.blockCloseCondition(checkCtx)) {
        break;
      }
    }

    // Standard mode: stop at NEWLINE
    if (!paragraphMode && token.type === "NEWLINE") {
      break;
    }

    // Paragraph mode: check for paragraph break or block start
    if (paragraphMode && token.type === "NEWLINE") {
      // Look ahead to check what's after the newline
      let lookAhead = 1;
      while (ctx.tokens[pos + lookAhead]?.type === "WHITESPACE") {
        lookAhead++;
      }
      const nextMeaningfulToken = ctx.tokens[pos + lookAhead];

      // Check if this is [[/span]] - don't treat as block start, handle inline
      let isOrphanCloseSpan = false;
      if (nextMeaningfulToken?.type === "BLOCK_END_OPEN") {
        // Check if it's [[/span]]
        const namePos = pos + lookAhead + 1;
        let nameLookAhead = 0;
        while (ctx.tokens[namePos + nameLookAhead]?.type === "WHITESPACE") {
          nameLookAhead++;
        }
        const nameToken = ctx.tokens[namePos + nameLookAhead];
        if (nameToken?.type === "IDENTIFIER" && nameToken.value.toLowerCase() === "span") {
          isOrphanCloseSpan = true;
        }
      }

      // Check if this is [[# name]] - anchor name is inline, not block start
      let isAnchorName = false;
      if (nextMeaningfulToken?.type === "BLOCK_OPEN") {
        const namePos = pos + lookAhead + 1;
        let nameLookAhead = 0;
        while (ctx.tokens[namePos + nameLookAhead]?.type === "WHITESPACE") {
          nameLookAhead++;
        }
        const hashToken = ctx.tokens[namePos + nameLookAhead];
        if (hashToken?.type === "HASH" || (hashToken?.type === "TEXT" && hashToken.value === "#")) {
          isAnchorName = true;
        }
      }

      // Check if this is [[>X or [[<X (where X is not ]]) - not a valid block opener
      // [[>]] and [[<]] are valid align blocks, but [[>toc]] etc. are invalid
      let isInvalidBlockOpen = false;
      if (nextMeaningfulToken?.type === "BLOCK_OPEN") {
        const afterOpen = pos + lookAhead + 1;
        const firstAfter = ctx.tokens[afterOpen];
        if (firstAfter?.type === "TEXT" && (firstAfter.value === ">" || firstAfter.value === "<")) {
          const secondAfter = ctx.tokens[afterOpen + 1];
          if (secondAfter && secondAfter.type !== "BLOCK_CLOSE") {
            isInvalidBlockOpen = true;
          }
        }
        // Check if this is [[footnoteblock]] but already parsed (2nd+ occurrence)
        let skipWhitespace = 0;
        while (ctx.tokens[afterOpen + skipWhitespace]?.type === "WHITESPACE") {
          skipWhitespace++;
        }
        const blockNameToken = ctx.tokens[afterOpen + skipWhitespace];
        if (
          blockNameToken &&
          (blockNameToken.type === "TEXT" || blockNameToken.type === "IDENTIFIER") &&
          blockNameToken.value.toLowerCase() === "footnoteblock" &&
          ctx.footnoteBlockParsed
        ) {
          isInvalidBlockOpen = true;
        }
      }

      // Check if HEADING_MARKER would actually succeed as a heading
      // Wikidot requires: 1-6 plus signs + whitespace. Otherwise it's plain text.
      let isInvalidHeading = false;
      if (nextMeaningfulToken?.type === "HEADING_MARKER") {
        const markerLen = nextMeaningfulToken.value.length;
        const afterMarkerPos = pos + lookAhead + 1;
        const afterMarker = ctx.tokens[afterMarkerPos];
        // Invalid if: 7+ plus signs, or no whitespace after marker (or after optional *)
        if (markerLen > 6) {
          isInvalidHeading = true;
        } else if (afterMarker?.type === "STAR") {
          // +* pattern - check whitespace after *
          const afterStar = ctx.tokens[afterMarkerPos + 1];
          if (afterStar?.type !== "WHITESPACE") {
            isInvalidHeading = true;
          }
        } else if (afterMarker?.type !== "WHITESPACE") {
          isInvalidHeading = true;
        }
      }

      // Stop at double NEWLINE, EOF, or block start token (at line start)
      // But don't stop at [[/span]], [[# name]], [[>/[[<, or invalid headings
      const isBlockStart =
        nextMeaningfulToken &&
        BLOCK_START_TOKENS.includes(nextMeaningfulToken.type) &&
        nextMeaningfulToken.lineStart &&
        !isOrphanCloseSpan &&
        !isAnchorName &&
        !isInvalidBlockOpen &&
        !isInvalidHeading;
      if (
        !nextMeaningfulToken ||
        nextMeaningfulToken.type === "NEWLINE" ||
        nextMeaningfulToken.type === "EOF" ||
        isBlockStart
      ) {
        // Check if a block rule with preservesPrecedingLineBreak matches at the next position.
        // Wikidot's Divalign expands content inline, so \n before it becomes <br />.
        // Other blocks (Code, Div, etc.) suppress this by prepending \n\n to their token.
        if (isBlockStart && nodes.length > 0) {
          const nextPos = pos + lookAhead;
          const shouldPreserve = ctx.blockRules.some(
            (rule) => rule.preservesPrecedingLineBreak && rule.isStartPattern?.(ctx, nextPos),
          );
          if (shouldPreserve) {
            const lb: any = { element: "line-break" };
            lb._preservedTrailingBreak = true;
            nodes.push(lb);
          }
        }
        // Consume the NEWLINE and stop
        consumed++;
        if (nextMeaningfulToken?.type === "NEWLINE") {
          consumed++; // Also consume second newline for paragraph break
        }
        break;
      }
    }

    if (token.type === endType) {
      break;
    }

    const inlineCtx: ParseContext = {
      ...ctx,
      pos,
    };

    let matched = false;
    for (const rule of inlineRules) {
      // Skip the rule that would match the end type to avoid infinite recursion
      if (rule.startTokens.includes(endType)) {
        continue;
      }
      if (canApplyInlineRule(rule, token)) {
        const result = rule.parse(inlineCtx);
        if (result.success) {
          nodes.push(...result.elements);
          consumed += result.consumed;
          pos += result.consumed;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Fallback to text
      nodes.push({ element: "text", data: token.value });
      consumed++;
      pos++;
    }
  }

  return { elements: nodes, consumed };
}

/**
 * Collect tokens until newline or EOF
 */
export function collectUntilNewline(ctx: ParseContext): { tokens: Token[]; consumed: number } {
  const tokens: Token[] = [];
  let consumed = 0;
  let pos = ctx.pos;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      break;
    }
    tokens.push(token);
    consumed++;
    pos++;
  }

  return { tokens, consumed };
}
