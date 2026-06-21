import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBlockquoteLine } from "./line";
export { buildBlockquoteElements } from "./build";

export interface BlockquoteLine {
  elements: Element[];
  hasLineBreak: boolean;
}

export interface ParsedBlockquoteLine {
  depth: number;
  ltype: null;
  value: BlockquoteLine;
}

export interface ParsedBlockquoteLines {
  lines: ParsedBlockquoteLine[];
  consumed: number;
}

export function collectBlockquoteLines(ctx: ParseContext): ParsedBlockquoteLines {
  const lines: ParsedBlockquoteLine[] = [];
  let pos = ctx.pos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const result = parseBlockquoteLine(ctx, pos);
    if (result.kind === "stop") break;

    pos += result.consumed;
    consumed += result.consumed;
    if (result.kind === "parsed") {
      lines.push(result.line);
    }
  }

  return { lines, consumed };
}
