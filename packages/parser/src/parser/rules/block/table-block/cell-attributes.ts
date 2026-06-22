import type { Alignment } from "@wdprlib/ast";

export interface ParsedTableCellAttributes {
  colspan: number;
  align: Alignment | null;
  attributes: Record<string, string>;
}

export function parseTableCellAttributes(
  attrs: Record<string, string>,
): ParsedTableCellAttributes {
  const cellAttrs = { ...attrs };
  const colspan = cellAttrs.colspan ? parseInt(cellAttrs.colspan, 10) : 1;
  const align = parseCellAlignment(cellAttrs.style);

  delete cellAttrs.colspan;

  return {
    colspan,
    align,
    attributes: cellAttrs,
  };
}

function parseCellAlignment(style: string | undefined): Alignment | null {
  if (!style) return null;

  const alignMatch = style.match(/text-align:\s*(left|center|right)/i);
  const value = alignMatch?.[1]?.toLowerCase();
  return isAlignment(value) ? value : null;
}

function isAlignment(value: string | undefined): value is Alignment {
  return value === "left" || value === "center" || value === "right";
}
