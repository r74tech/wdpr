/**
 *
 * Parses the Wikidot span block syntax: `[[span attributes]]content[[/span]]`
 * and its paragraph-strip variant `[[span_]]`.
 *
 * A span wraps inline content in an HTML `<span>` element with arbitrary
 * attributes (class, style, id, etc.). It supports multiline content
 * where single newlines become `<br />` elements.
 *
 * Blank lines (double newlines) within spans trigger special behavior:
 *
 * Regular span (`[[span]]`):
 * - Blank lines split the content into separate spans, each placed in
 *   its own paragraph. Segments after the first are marked with
 *   `_splitByBlankLine: true` for postprocessing.
 *
 * Paragraph-strip span (`[[span_]]`):
 * - Content before a blank line gets `_paragraphStrip: true`, indicating
 *   it should merge with the surrounding paragraph.
 * - Content after a blank line gets `_escapedFromParagraph: true`,
 *   indicating it should appear outside any paragraph wrapper.
 * - An empty `[[span_]][[/span]]` produces a marker with
 *   `_emptyParagraphStrip: true` that absorbs adjacent line breaks.
 *
 * Spans support nesting -- a `[[span]]` inside another `[[span]]` will
 * correctly find its own `[[/span]]` closing tag.
 *
 * The `closeSpanRule` handles orphaned `[[/span]]` tags that result
 * from paragraph-break splitting. These wrap preceding inline content
 * into a span, matching Wikidot's behavior.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { inlineRules } from "../index";
import { parseBlockName } from "../utils";
import { parseAttributes } from "../block/utils";
import { canApplyInlineRule } from "./utils";

/**
 * Inline rule for parsing `[[span attributes]]content[[/span]]`.
 *
 * Triggered by a `BLOCK_OPEN` (`[[`) token. Recognizes both `span`
 * and `span_` block names. Parses HTML attributes after the block name,
 * then recursively parses inline content (including nested spans) until
 * the matching `[[/span]]` closing tag.
 *
 * Fails if:
 * - The block name is not `span` or `span_`
 * - No `]]` follows the attributes
 * - No matching `[[/span]]` closing tag is found
 */
export const spanRule: InlineRule = {
  name: "span",
  startTokens: ["BLOCK_OPEN"],

  /**
   * Attempts to parse a span block at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with one or more `"container"` elements
   *          of type `"span"`, or `{ success: false }`
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult) {
      return { success: false };
    }

    const blockName = nameResult.name;
    // Handle both span and span_ (paragraph strip mode)
    if (blockName !== "span" && blockName !== "span_") {
      return { success: false };
    }

    const paragraphStrip = blockName === "span_";

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Parse attributes
    const attrResult = parseAttributes(ctx, pos);
    pos += attrResult.consumed;
    consumed += attrResult.consumed;

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Parse inline content until [[/span]]
    // Span supports multi-line content - newlines become line-breaks
    // For regular span: blank lines split into separate paragraphs with spans
    const children: Element[] = [];
    const escapedChildren: Element[] = []; // For span_: content after blank line
    const splitSpans: Element[][] = []; // For regular span: content segments split by blank lines
    let foundClose = false;
    let afterBlankLine = false; // For span_: tracks if we're after a blank line

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") {
        break;
      }

      // Check for [[/span]]
      if (token.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        if (closeNameResult && closeNameResult.name === "span") {
          // Skip [[/span]]
          pos++; // [[/
          consumed++;
          pos += closeNameResult.consumed; // span
          consumed += closeNameResult.consumed;
          // Skip ]]
          if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
            pos++;
            consumed++;
          }
          foundClose = true;
          break;
        }
      }

      // Handle NEWLINE
      if (token.type === "NEWLINE") {
        // Check for paragraph break (blank line = double newline)
        // Skip whitespace to find next meaningful token
        let lookAhead = 1;
        while (ctx.tokens[pos + lookAhead]?.type === "WHITESPACE") {
          lookAhead++;
        }
        const nextToken = ctx.tokens[pos + lookAhead];

        // If next token is another NEWLINE, this is a paragraph break
        if (nextToken?.type === "NEWLINE") {
          if (paragraphStrip) {
            // For span_: blank lines split the span, content after goes outside paragraph
            // Consume the blank lines and continue parsing
            pos++; // First newline
            consumed++;
            while (ctx.tokens[pos]?.type === "WHITESPACE" || ctx.tokens[pos]?.type === "NEWLINE") {
              pos++;
              consumed++;
            }
            // Mark that we're now parsing escaped content (outside paragraph)
            afterBlankLine = true;
            continue;
          }
          // For regular span: blank lines split into separate spans in separate paragraphs
          // Save current content and start a new segment
          if (children.length > 0) {
            splitSpans.push([...children]);
            children.length = 0;
          }
          pos++; // First newline
          consumed++;
          // Skip whitespace and additional newlines
          while (ctx.tokens[pos]?.type === "WHITESPACE" || ctx.tokens[pos]?.type === "NEWLINE") {
            pos++;
            consumed++;
          }
          continue;
        }

        // Single newline - convert to line-break
        const targetChildren = afterBlankLine ? escapedChildren : children;
        targetChildren.push({ element: "line-break" });
        pos++;
        consumed++;
        // Skip leading whitespace after newline
        while (ctx.tokens[pos]?.type === "WHITESPACE" && ctx.tokens[pos]?.lineStart) {
          pos++;
          consumed++;
        }
        continue;
      }

      // Skip whitespace at beginning of content (after ]] or after newline)
      // But don't skip whitespace between words
      if (token.type === "WHITESPACE" && token.lineStart) {
        pos++;
        consumed++;
        continue;
      }

      // Determine which array to add content to
      const targetChildren = afterBlankLine ? escapedChildren : children;

      // Try each inline rule
      let matched = false;
      const inlineCtx: ParseContext = { ...ctx, pos };

      for (const rule of inlineRules) {
        // Allow nested spans - each nested span will find its own [[/span]] closing tag
        // No infinite recursion because each span consumes its own opening and closing tags
        if (canApplyInlineRule(rule, token)) {
          const result = rule.parse(inlineCtx);
          if (result.success) {
            targetChildren.push(...result.elements);
            pos += result.consumed;
            consumed += result.consumed;
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        // Fallback: just add as text
        targetChildren.push({ element: "text", data: token.value });
        pos++;
        consumed++;
      }
    }

    // If we didn't find [[/span]], this is not a valid span
    if (!foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: `Missing closing tag [[/span]] for [[${blockName}]]`,
        position: openToken.position,
      });
      return { success: false };
    }

    // For span_ (paragraph strip mode):
    // - Empty span_ produces no output
    // - Non-empty span_ gets a _paragraphStrip marker for paragraph merging
    // - Content after blank line gets _escapedFromParagraph marker
    if (paragraphStrip) {
      // Remove leading/trailing line-breaks from both arrays
      while (children.length > 0 && children[0]?.element === "line-break") {
        children.shift();
      }
      while (children.length > 0 && children[children.length - 1]?.element === "line-break") {
        children.pop();
      }
      while (escapedChildren.length > 0 && escapedChildren[0]?.element === "line-break") {
        escapedChildren.shift();
      }
      while (
        escapedChildren.length > 0 &&
        escapedChildren[escapedChildren.length - 1]?.element === "line-break"
      ) {
        escapedChildren.pop();
      }

      const elements: Element[] = [];

      // Main span (before blank line) - gets _paragraphStrip
      if (children.length > 0) {
        elements.push({
          element: "container",
          data: {
            type: "span",
            attributes: attrResult.attrs,
            elements: children,
            _paragraphStrip: true,
          },
        });
      }

      // Escaped spans (after blank line) - get _escapedFromParagraph
      if (escapedChildren.length > 0) {
        elements.push({
          element: "container",
          data: {
            type: "span",
            attributes: {},
            elements: escapedChildren,
            _escapedFromParagraph: true,
          },
        });
      }

      // Empty span_ - return a marker that will absorb adjacent line-breaks
      if (elements.length === 0) {
        return {
          success: true,
          elements: [
            {
              element: "container",
              data: {
                type: "span",
                attributes: {},
                elements: [],
                _emptyParagraphStrip: true,
              },
            },
          ],
          consumed,
        };
      }

      return {
        success: true,
        elements,
        consumed,
      };
    }

    // For regular span with blank lines: return multiple spans with _splitByBlankLine marker
    // These will be processed by postprocess to create separate paragraphs
    if (splitSpans.length > 0) {
      // Add remaining children as last segment
      if (children.length > 0) {
        splitSpans.push(children);
      }

      const elements: Element[] = splitSpans.map((segment, index) => ({
        element: "container" as const,
        data: {
          type: "span" as const,
          attributes: index === 0 ? attrResult.attrs : {},
          elements: segment,
          _splitByBlankLine: index > 0, // Mark segments after first for paragraph splitting
        },
      }));

      return {
        success: true,
        elements,
        consumed,
      };
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "span",
            attributes: attrResult.attrs,
            elements: children,
          },
        },
      ],
      consumed,
    };
  },
};

/**
 * Inline rule for handling orphaned `[[/span]]` closing tags.
 *
 * When a span is split across paragraphs by a blank line, the closing
 * `[[/span]]` tag appears without a matching opening tag in the current
 * inline context. This rule detects such orphaned closing tags and
 * produces a special marker element with `_closeSpan: true`.
 *
 * The paragraph parser uses this marker to retroactively wrap all
 * preceding inline content in the current paragraph into a span,
 * replicating Wikidot's behavior for paragraph-split spans.
 *
 * Triggered by a `BLOCK_END_OPEN` (`[[/`) token, and only matches
 * when the block name is `span`.
 */
export const closeSpanRule: InlineRule = {
  name: "closeSpan",
  startTokens: ["BLOCK_END_OPEN"],

  /**
   * Attempts to parse an orphaned `[[/span]]` tag at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with a span marker element (with `_closeSpan: true`),
   *          or `{ success: false }` if this is not a `[[/span]]` tag
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const token = currentToken(ctx);
    if (token.type !== "BLOCK_END_OPEN") {
      return { success: false };
    }

    // Check if this is [[/span]]
    const nameResult = parseBlockName(ctx, ctx.pos + 1);
    if (!nameResult || nameResult.name !== "span") {
      return { success: false };
    }

    let pos = ctx.pos + 1 + nameResult.consumed;
    let consumed = 1 + nameResult.consumed;

    // Skip ]]
    if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
      pos++;
      consumed++;
    }

    // Return a special marker that indicates "wrap preceding content in span"
    // The paragraph parser will handle this
    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "span",
            attributes: {},
            elements: [],
            _closeSpan: true,
          },
        },
      ],
      consumed,
    };
  },
};
