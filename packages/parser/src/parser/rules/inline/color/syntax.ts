import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { hasClosingMarkerBeforeNewline } from "../../types";
import { parseInlineUntil } from "../utils";

export interface ColorContent {
  color: string;
  elements: Element[];
  consumed: number;
}

export function parseColorContent(ctx: ParseContext): ColorContent | null {
  if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: ctx.pos + 1 }, "COLOR_MARKER")) {
    return null;
  }

  let pos = ctx.pos + 1;
  let consumed = 1;
  let colorSpec = "";

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "PIPE" ||
      token.type === "COLOR_MARKER" ||
      token.type === "NEWLINE" ||
      token.type === "EOF"
    ) {
      break;
    }
    colorSpec += token.value;
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type !== "PIPE") {
    return null;
  }
  pos++;
  consumed++;

  const contentResult = parseInlineUntil({ ...ctx, pos }, "COLOR_MARKER");
  pos += contentResult.consumed;
  consumed += contentResult.consumed;

  if (ctx.tokens[pos]?.type !== "COLOR_MARKER") {
    return null;
  }
  consumed++;

  const color = colorSpec.trim();
  if (color === "" || contentResult.elements.length === 0) {
    return null;
  }

  return {
    color: hexifyColor(color),
    elements: contentResult.elements,
    consumed,
  };
}

function hexifyColor(color: string): string {
  if (/^[a-fA-F0-9]{3}$/.test(color) || /^[a-fA-F0-9]{6}$/.test(color)) {
    return `#${color}`;
  }
  return color;
}
