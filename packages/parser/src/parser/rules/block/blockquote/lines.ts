import type { ParseContext } from "../../types";
import { parseBlockquoteLine } from "./line";
export { buildBlockquoteElements } from "./build";

/** Half-open range of the line's content tokens in the enclosing token stream. */
export interface BlockquoteLine {
  start: number;
  end: number;
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
