import type { Alignment } from "@wdprlib/ast";
import type { ParseContext } from "../../../types";

export interface CellStart {
  align?: Alignment;
  header: boolean;
  colspan: number;
}

export function parseCellStart(
  ctx: ParseContext,
  startPos: number,
): { cellStart: CellStart; consumed: number } | null {
  let pos = startPos;
  let colspan = 0;
  let align: Alignment | undefined;
  let header = false;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token) break;

    if (token.type === "TABLE_HEADER") {
      colspan++;
      header = true;
      pos++;
      break;
    }
    if (token.type === "TABLE_LEFT") {
      colspan++;
      align = "left";
      pos++;
      break;
    }
    if (token.type === "TABLE_CENTER") {
      colspan++;
      align = "center";
      pos++;
      break;
    }
    if (token.type === "TABLE_RIGHT") {
      colspan++;
      align = "right";
      pos++;
      break;
    }
    if (token.type === "TABLE_MARKER") {
      colspan++;
      pos++;
      continue;
    }
    if (colspan > 0) {
      return {
        cellStart: { align, header, colspan },
        consumed: pos - startPos,
      };
    }
    return null;
  }

  if (colspan > 0) {
    return {
      cellStart: { align, header, colspan },
      consumed: pos - startPos,
    };
  }

  return null;
}
