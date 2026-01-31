/**
 * Block-style table rule
 *
 * Handles [[table]][[row]][[cell]]...[[/cell]][[/row]][[/table]] syntax
 */
import type { Element, TableData, TableRow, TableCell, Alignment } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName, parseAttributes, parseBlocksUntil } from "./utils";

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
 * Parse [[row]]...[[/row]]
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
 * Parse [[cell]]...[[/cell]] or [[hcell]]...[[/hcell]]
 * Supports nested tables within cells
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

  // Parse cell content using parseBlocksUntil (supports block elements like div, blockquote, etc.)
  const bodyCtx: ParseContext = { ...ctx, pos };
  const bodyResult = parseBlocksUntil(bodyCtx, closeCondition);
  consumed += bodyResult.consumed;
  pos += bodyResult.consumed;

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

  const processedElements = bodyResult.elements;

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
