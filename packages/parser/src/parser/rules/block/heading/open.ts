import type { HeadingLevel } from "@wdprlib/ast";
import type { ParseContext } from "../../types";

export interface HeadingOpenResult {
  level: HeadingLevel;
  hidden: boolean;
  bodyStart: number;
  consumed: number;
}

export function parseHeadingOpen(ctx: ParseContext): HeadingOpenResult | null {
  const marker = ctx.tokens[ctx.pos];
  if (marker?.type !== "HEADING_MARKER" || !marker.lineStart) {
    return null;
  }

  if (!isHeadingLevel(marker.value.length)) {
    return null;
  }

  let pos = ctx.pos + 1;
  let consumed = 1;
  let hidden = false;

  if (ctx.tokens[pos]?.type === "STAR") {
    hidden = true;
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type !== "WHITESPACE") {
    return null;
  }

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  return {
    level: marker.value.length,
    hidden,
    bodyStart: pos,
    consumed,
  };
}

function isHeadingLevel(length: number): length is HeadingLevel {
  return length >= 1 && length <= 6;
}
