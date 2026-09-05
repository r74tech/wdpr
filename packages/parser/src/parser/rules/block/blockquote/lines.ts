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

  blankCommentOnlyLines(ctx, lines);

  return { lines, consumed };
}

/**
 * Wikidot strips comments before parsing the quoted content, so a line left
 * with nothing becomes blank and separates paragraphs. Unterminated comments
 * stay literal, hence the scan only covers closed ones.
 */
function blankCommentOnlyLines(ctx: ParseContext, lines: ParsedBlockquoteLine[]): void {
  const positions: { line: number; pos: number }[] = [];
  lines.forEach((line, index) => {
    for (let pos = line.value.start; pos < line.value.end; pos++) {
      if (ctx.tokens[pos]?.type !== "NEWLINE") {
        positions.push({ line: index, pos });
      }
    }
  });

  const commented: boolean[] = Array.from({ length: positions.length }, () => false);
  for (let open = 0; open < positions.length; open++) {
    if (ctx.tokens[positions[open]!.pos]?.type !== "COMMENT_OPEN") continue;

    for (let close = open + 1; close < positions.length; close++) {
      if (ctx.tokens[positions[close]!.pos]?.type !== "COMMENT_CLOSE") continue;
      commented.fill(true, open, close + 1);
      open = close;
      break;
    }
  }

  const hasContent: boolean[] = Array.from({ length: lines.length }, () => false);
  positions.forEach(({ line, pos }, index) => {
    if (commented[index] || ctx.tokens[pos]?.type === "WHITESPACE") return;
    hasContent[line] = true;
  });

  lines.forEach((line, index) => {
    if (hasContent[index]) return;
    const { end } = line.value;
    line.value.start = ctx.tokens[end - 1]?.type === "NEWLINE" ? end - 1 : end;
  });
}
