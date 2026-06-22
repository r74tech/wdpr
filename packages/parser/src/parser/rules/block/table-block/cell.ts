import type { TableCell } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseTableCellAttributes } from "./cell-attributes";
import {
  consumeTableCellClose,
  createCellCloseCondition,
  parseTableCellOpen,
} from "./cell-boundary";
import { parseCellContent, unwrapSingleInlineParagraph } from "./cell-content";

/**
 * Parses a `[[cell ...]]...[[/cell]]` or `[[hcell ...]]...[[/hcell]]` block.
 */
export function parseTableBlockCell(
  ctx: ParseContext,
  startPos: number,
): { cell: TableCell; consumed: number } | null {
  const openResult = parseTableCellOpen(ctx, startPos);
  if (!openResult) {
    return null;
  }

  let pos = openResult.pos;
  let consumed = openResult.consumed;
  const cellAttrs = parseTableCellAttributes(openResult.attrs);
  const closeName = openResult.tagName;
  const bodyCtx: ParseContext = { ...ctx, pos };
  const bodyResult = parseCellContent(bodyCtx, createCellCloseCondition(closeName));
  consumed += bodyResult.consumed;
  pos += bodyResult.consumed;

  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") {
    ctx.diagnostics.push({
      severity: "warning",
      code: "unclosed-block",
      message: `Missing closing tag [[/${closeName}]] for [[${closeName}]]`,
      position: ctx.tokens[startPos]?.position ?? {
        start: { line: 0, column: 0, offset: 0 },
        end: { line: 0, column: 0, offset: 0 },
      },
    });
  }

  if (ctx.tokens[pos]?.type === "BLOCK_END_OPEN") {
    const closeConsumed = consumeTableCellClose(ctx, pos);
    pos += closeConsumed;
    consumed += closeConsumed;
  }

  const elements = bodyResult.hadParagraphBreaks
    ? bodyResult.elements
    : unwrapSingleInlineParagraph(bodyResult.elements);

  return {
    cell: {
      header: openResult.isHeader,
      "column-span": cellAttrs.colspan,
      align: cellAttrs.align,
      attributes: cellAttrs.attributes,
      elements,
    },
    consumed,
  };
}
