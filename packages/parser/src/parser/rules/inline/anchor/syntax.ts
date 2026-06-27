import type { ParseContext } from "../../types";

export interface AnchorBlockName {
  name: string;
  paragraphStrip: boolean;
  consumed: number;
}

export function parseAnchorBlockName(ctx: ParseContext, startPos: number): AnchorBlockName | null {
  let pos = startPos;
  let consumed = 0;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const token = ctx.tokens[pos];
  if (!token || (token.type !== "TEXT" && token.type !== "IDENTIFIER")) {
    return null;
  }

  let name = token.value.toLowerCase();
  consumed++;
  pos++;

  let paragraphStrip = false;
  if (ctx.tokens[pos]?.type === "UNDERSCORE") {
    paragraphStrip = true;
    name += "_";
    consumed++;
  }

  return { name, paragraphStrip, consumed };
}

export function isAnchorBlockName(name: string): boolean {
  const baseName = name.replace(/_$/, "");
  return baseName === "a" || baseName === "anchor";
}
