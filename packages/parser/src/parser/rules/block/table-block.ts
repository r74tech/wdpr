/**
 * @module table-block
 *
 * Block rule for the explicit block-syntax table:
 * `[[table]][[row]][[cell]]...[[/cell]][[/row]][[/table]]`.
 *
 * This is the structured alternative to the pipe-syntax table (`||`).
 * Each element carries optional HTML attributes:
 *
 * ```
 * [[table class="wiki-table"]]
 *   [[row]]
 *     [[hcell style="width: 50%"]]Header[[/hcell]]
 *     [[cell colspan="2"]]Data[[/cell]]
 *   [[/row]]
 * [[/table]]
 * ```
 *
 * Key details:
 * - `[[hcell]]` produces header cells (`<th>`), `[[cell]]` produces data
 *   cells (`<td>`).
 * - `colspan` is extracted from cell attributes and mapped to `column-span`.
 * - Alignment can be derived from the `style` attribute's `text-align` value.
 * - Cell content supports both block and inline elements, including nested
 *   tables. The custom {@link parseCellContent} handles paragraph wrapping
 *   and block detection within cells.
 * - Empty tables or tables with only empty rows fail the rule, falling
 *   back to text rendering.
 * - The table element carries `_source: "block"` in attributes to
 *   distinguish it from pipe-syntax tables.
 */
import type { Element, TableData, TableRow, TableCell, Alignment } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName, parseAttributes, canApplyBlockRule } from "./utils";
import { canApplyInlineRule } from "../inline/utils";

/**
 * Block rule for `[[table]]...[[/table]]` with `[[row]]` and
 * `[[cell]]`/`[[hcell]]` children.
 */
export const tableBlockRule: BlockRule = {
  name: "table-block",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult || nameResult.name !== "table") {
      return { success: false };
    }

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

    // Skip optional newline after [[table]]
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    // Parse rows
    const rows: TableRow[] = [];

    while (pos < ctx.tokens.length) {
      // Skip whitespace and newlines
      while (ctx.tokens[pos]?.type === "WHITESPACE" || ctx.tokens[pos]?.type === "NEWLINE") {
        pos++;
        consumed++;
      }

      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") {
        break;
      }

      // Check for [[/table]]
      if (token.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        if (closeNameResult?.name === "table") {
          // Consume [[/table]]
          pos++; // [[/
          consumed++;
          pos += closeNameResult.consumed; // table
          consumed += closeNameResult.consumed;
          if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
            pos++;
            consumed++;
          }
          if (ctx.tokens[pos]?.type === "NEWLINE") {
            pos++;
            consumed++;
          }
          break;
        }
      }

      // Check for [[row]]
      if (token.type === "BLOCK_OPEN") {
        const rowNameResult = parseBlockName(ctx, pos + 1);
        if (rowNameResult?.name === "row") {
          const rowResult = parseRow(ctx, pos);
          if (rowResult) {
            rows.push(rowResult.row);
            pos += rowResult.consumed;
            consumed += rowResult.consumed;
            continue;
          }
        }
      }

      // Unknown token, skip to avoid infinite loop
      pos++;
      consumed++;
    }

    // Wikidot behavior: empty tables or tables with only empty rows are not parsed
    // They should be treated as plain text instead
    const hasValidContent = rows.some((row) => row.cells.length > 0);
    if (!hasValidContent) {
      return { success: false };
    }

    const tableData: TableData = {
      attributes: { ...attrResult.attrs, _source: "block" },
      rows,
    };

    return {
      success: true,
      elements: [
        {
          element: "table",
          data: tableData,
        },
      ],
      consumed,
    };
  },
};

/**
 * Parses a `[[row ...]]...[[/row]]` block, collecting its child cells.
 *
 * Row attributes (e.g. `class`, `style`) are passed through to the AST.
 * The function skips whitespace/newlines between cells and stops when
 * `[[/row]]` is found or the token stream ends.
 *
 * @param ctx      - Parse context.
 * @param startPos - Token index at the `[[row]]` BLOCK_OPEN.
 * @returns The parsed row and consumed count, or `null` on failure.
 */
function parseRow(ctx: ParseContext, startPos: number): { row: TableRow; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  // Expect [[row]]
  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") {
    return null;
  }
  pos++;
  consumed++;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || nameResult.name !== "row") {
    return null;
  }
  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  // Parse row attributes
  const attrResult = parseAttributes(ctx, pos);
  pos += attrResult.consumed;
  consumed += attrResult.consumed;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }
  pos++;
  consumed++;

  // Skip optional newline
  if (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  // Parse cells
  const cells: TableCell[] = [];

  while (pos < ctx.tokens.length) {
    // Skip whitespace and newlines
    while (ctx.tokens[pos]?.type === "WHITESPACE" || ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    // Check for [[/row]]
    if (token.type === "BLOCK_END_OPEN") {
      const closeNameResult = parseBlockName(ctx, pos + 1);
      if (closeNameResult?.name === "row") {
        // Consume [[/row]]
        pos++;
        consumed++;
        pos += closeNameResult.consumed;
        consumed += closeNameResult.consumed;
        if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
          pos++;
          consumed++;
        }
        if (ctx.tokens[pos]?.type === "NEWLINE") {
          pos++;
          consumed++;
        }
        break;
      }
    }

    // Check for [[cell]] or [[hcell]]
    if (token.type === "BLOCK_OPEN") {
      const cellNameResult = parseBlockName(ctx, pos + 1);
      if (cellNameResult?.name === "cell" || cellNameResult?.name === "hcell") {
        const cellResult = parseCell(ctx, pos);
        if (cellResult) {
          cells.push(cellResult.cell);
          pos += cellResult.consumed;
          consumed += cellResult.consumed;
          continue;
        }
      }
    }

    // Unknown token, skip
    pos++;
    consumed++;
  }

  return {
    row: {
      attributes: attrResult.attrs,
      cells,
    },
    consumed,
  };
}

/**
 * Parses a `[[cell ...]]...[[/cell]]` or `[[hcell ...]]...[[/hcell]]` block.
 *
 * Cell body content is parsed via {@link parseCellContent}, which supports
 * block elements (including nested tables), inline markup, and paragraph
 * breaks. After parsing, simple single-paragraph content is unwrapped
 * to match Wikidot's behaviour of not wrapping simple cells in `<p>`.
 *
 * The `colspan` attribute is extracted separately and mapped to
 * `column-span` in the AST. Other attributes (rowspan, style, etc.) are
 * kept in the attributes map for the renderer.
 *
 * @param ctx      - Parse context.
 * @param startPos - Token index at the `[[cell]]`/`[[hcell]]` BLOCK_OPEN.
 * @returns The parsed cell and consumed count, or `null` on failure.
 */
function parseCell(
  ctx: ParseContext,
  startPos: number,
): { cell: TableCell; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  // Expect [[cell]] or [[hcell]]
  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") {
    return null;
  }
  pos++;
  consumed++;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || (nameResult.name !== "cell" && nameResult.name !== "hcell")) {
    return null;
  }

  const isHeader = nameResult.name === "hcell";
  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  // Parse cell attributes
  const attrResult = parseAttributes(ctx, pos);
  pos += attrResult.consumed;
  consumed += attrResult.consumed;

  // Extract colspan from attributes (rowspan stays in attributes for renderer)
  const colspan = attrResult.attrs.colspan ? parseInt(attrResult.attrs.colspan, 10) : 1;

  // Extract alignment from style attribute
  let align: Alignment | null = null;
  const style = attrResult.attrs.style;
  if (style) {
    const alignMatch = style.match(/text-align:\s*(left|center|right)/i);
    if (alignMatch) {
      align = alignMatch[1]?.toLowerCase() as Alignment;
    }
  }

  // Remove colspan from attributes (it's handled separately via column-span)
  const cellAttrs = { ...attrResult.attrs };
  delete cellAttrs.colspan;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }
  pos++;
  consumed++;

  // Skip optional newline after [[cell]]
  if (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  const closeName = isHeader ? "hcell" : "cell";

  // Close condition for [[/cell]] or [[/hcell]]
  const closeCondition = (checkCtx: ParseContext): boolean => {
    const token = checkCtx.tokens[checkCtx.pos];
    if (token?.type === "BLOCK_END_OPEN") {
      const closeNameResult = parseBlockName(checkCtx, checkCtx.pos + 1);
      if (closeNameResult?.name === closeName) {
        return true;
      }
    }
    return false;
  };

  // Parse cell content using parseCellContent (supports inline blocks like nested tables)
  const bodyCtx: ParseContext = { ...ctx, pos };
  const bodyResult = parseCellContent(bodyCtx, closeCondition);
  consumed += bodyResult.consumed;
  pos += bodyResult.consumed;
  const hadParagraphBreaks = bodyResult.hadParagraphBreaks;

  // Consume [[/cell]] or [[/hcell]]
  if (ctx.tokens[pos]?.type === "BLOCK_END_OPEN") {
    pos++;
    consumed++;
    const closeNameResult = parseBlockName(ctx, pos);
    if (closeNameResult) {
      pos += closeNameResult.consumed;
      consumed += closeNameResult.consumed;
    }
    if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
      pos++;
      consumed++;
    }
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }
  }

  // Process cell elements: unwrap single paragraph if it contains only inline elements
  // Wikidot behavior:
  // - Simple inline content (no newlines/blank lines) → direct elements (no paragraph wrapper)
  // - Content with blank lines or blocks → keep paragraph wrappers
  const processedElements = hadParagraphBreaks
    ? bodyResult.elements
    : unwrapSingleInlineParagraph(bodyResult.elements);

  return {
    cell: {
      header: isHeader,
      "column-span": colspan,
      align,
      attributes: cellAttrs,
      elements: processedElements,
    },
    consumed,
  };
}

/**
 * Unwraps a single-paragraph cell body to match Wikidot's rendering.
 *
 * When a cell contains exactly one paragraph with no block-level children,
 * the paragraph wrapper is removed and its inner elements are returned
 * directly. This produces output like `<td>text</td>` instead of
 * `<td><p>text</p></td>`.
 *
 * If there are multiple elements, block children, or non-paragraph content,
 * the array is returned as-is.
 *
 * @param elements - The parsed cell body elements.
 * @returns Elements with the single paragraph unwrapped, if applicable.
 */
function unwrapSingleInlineParagraph(elements: Element[]): Element[] {
  // Only unwrap if there's exactly one element and it's a paragraph container
  if (elements.length !== 1) {
    return elements;
  }

  const first = elements[0];
  if (
    first?.element !== "container" ||
    typeof first.data !== "object" ||
    first.data === null ||
    !("type" in first.data) ||
    first.data.type !== "paragraph"
  ) {
    return elements;
  }

  // Check if paragraph contains any block elements
  // If it does, keep the paragraph wrapper
  const paragraphData = first.data as { elements?: Element[] };
  const innerElements = paragraphData.elements ?? [];

  const hasBlockElement = innerElements.some((el) => isBlockElement(el));
  if (hasBlockElement) {
    return elements;
  }

  // Unwrap: return the paragraph's inner elements directly
  return innerElements;
}

/**
 * Determines whether an element is block-level.
 *
 * Block elements (tables, divs, blockquotes, code, etc.) prevent the
 * single-paragraph unwrapping optimisation in {@link unwrapSingleInlineParagraph}.
 *
 * @param el - The element to test.
 * @returns `true` if the element is block-level.
 */
function isBlockElement(el: Element): boolean {
  // Block elements that should prevent unwrapping
  const blockTypes = ["table", "div", "blockquote", "code", "list", "iframe", "image-block"];

  if (blockTypes.includes(el.element)) {
    return true;
  }

  // Also check for container types that are block-level
  if (el.element === "container" && typeof el.data === "object" && el.data !== null) {
    const data = el.data as { type?: string };
    if (data.type === "paragraph" || data.type === "div" || data.type === "blockquote") {
      return true;
    }
  }

  return false;
}

/**
 * Parses cell body content with support for both inline and block elements.
 *
 * Unlike the general {@link parseBlocksUntil}, this function recognises
 * block elements (nested tables, divs, etc.) even when they do not appear
 * at line start, because cell content inside `[[cell]]` is treated more
 * permissively by Wikidot.
 *
 * Paragraph handling:
 * - Simple inline content on a single line is NOT wrapped in a paragraph.
 * - A blank line (double newline) creates a paragraph break.
 * - Block elements flush the current inline segment into a paragraph
 *   and are emitted as standalone elements.
 *
 * The `hadParagraphBreaks` flag in the return value tells the caller
 * whether any blank-line paragraph breaks occurred, which influences
 * whether the final result keeps paragraph wrappers.
 *
 * @param ctx            - Parse context.
 * @param closeCondition - Predicate that returns `true` at the cell's
 *                         closing tag (`[[/cell]]` or `[[/hcell]]`).
 * @returns Parsed elements, consumed count, and paragraph-break flag.
 */
function parseCellContent(
  ctx: ParseContext,
  closeCondition: (ctx: ParseContext) => boolean,
): { elements: Element[]; consumed: number; hadParagraphBreaks: boolean } {
  const elements: Element[] = [];
  let consumed = 0;
  let pos = ctx.pos;

  // Collect inline content segments
  let currentSegment: Element[] = [];
  // Track if content spans multiple "parts" (blocks, blank lines, or newlines before blocks)
  let hasMultipleParts = false;
  // Track if we've added any block element
  let hasBlockElement = false;
  // Track if we've seen any blank line (paragraph break)
  let hadParagraphBreaks = false;

  const flushSegment = (wrapInParagraph: boolean) => {
    if (currentSegment.length === 0) return;

    // Trim trailing whitespace and line-breaks
    while (currentSegment.length > 0) {
      const last = currentSegment[currentSegment.length - 1];
      if (last?.element === "text" && typeof last.data === "string" && last.data.trim() === "") {
        currentSegment.pop();
      } else if (last?.element === "line-break") {
        currentSegment.pop();
      } else {
        break;
      }
    }

    // Trim leading whitespace
    while (currentSegment.length > 0) {
      const first = currentSegment[0];
      if (first?.element === "text" && typeof first.data === "string" && first.data.trim() === "") {
        currentSegment.shift();
      } else {
        break;
      }
    }

    if (currentSegment.length === 0) return;

    if (wrapInParagraph) {
      elements.push({
        element: "container",
        data: {
          type: "paragraph",
          attributes: {},
          elements: [...currentSegment],
        },
      });
    } else {
      elements.push(...currentSegment);
    }
    currentSegment = [];
  };

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

    // Handle newlines
    if (token.type === "NEWLINE") {
      pos++;
      consumed++;

      // Check for blank line (paragraph break)
      if (ctx.tokens[pos]?.type === "NEWLINE") {
        // Skip additional newlines
        while (ctx.tokens[pos]?.type === "NEWLINE") {
          pos++;
          consumed++;
        }

        // Flush current segment as paragraph
        flushSegment(true);
        // Blank line means all subsequent content should be in paragraphs
        hasMultipleParts = true;
        hadParagraphBreaks = true;

        // Skip whitespace after blank line
        while (ctx.tokens[pos]?.type === "WHITESPACE") {
          pos++;
          consumed++;
        }
        continue;
      }

      // Single newline - check if next is block start or close
      const nextToken = ctx.tokens[pos];
      if (!nextToken || nextToken.type === "BLOCK_END_OPEN" || nextToken.type === "EOF") {
        continue;
      }

      // Check if next token would start a block
      if (nextToken.type === "BLOCK_OPEN") {
        // This newline separates text from block - flush as paragraph
        flushSegment(true);
        hasMultipleParts = true;
        continue;
      }

      // If we have no content yet, this is just leading whitespace - skip
      if (currentSegment.length === 0 && elements.length === 0) {
        continue;
      }

      // Otherwise, treat as line break within same segment
      currentSegment.push({ element: "line-break" });
      continue;
    }

    // Skip whitespace at line start
    if (token.type === "WHITESPACE" && token.lineStart) {
      pos++;
      consumed++;
      continue;
    }

    // Try block rules first (for nested tables, divs, etc.)
    let matched = false;
    const blockCtx: ParseContext = { ...ctx, pos };

    for (const rule of ctx.blockRules) {
      if (canApplyBlockRule(rule, token)) {
        const result = rule.parse(blockCtx);
        if (result.success) {
          // Flush current segment before adding block
          if (currentSegment.length > 0) {
            flushSegment(true);
            hasMultipleParts = true;
          }

          elements.push(...result.elements);
          hasBlockElement = true;
          hasMultipleParts = true;
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
      if (canApplyInlineRule(rule, token)) {
        const result = rule.parse(inlineCtx);
        if (result.success) {
          currentSegment.push(...result.elements);
          consumed += result.consumed;
          pos += result.consumed;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Fallback to text
      currentSegment.push({ element: "text", data: token.value });
      consumed++;
      pos++;
    }
  }

  // Flush remaining segment
  // Wrap in paragraph if we had multiple parts or block elements
  flushSegment(hasMultipleParts || hasBlockElement);

  return { elements, consumed, hadParagraphBreaks };
}
