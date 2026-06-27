import type { AttributeMap } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseAttributes, parseBlockName } from "../utils";

export interface DivOpenResult {
  blockName: "div" | "div_";
  paragraphStrip: boolean;
  attributes: AttributeMap;
  bodyStart: number;
  consumed: number;
  hasRequiredNewline: boolean;
}

export function parseDivOpen(ctx: ParseContext): DivOpenResult | null {
  if (ctx.tokens[ctx.pos]?.type !== "BLOCK_OPEN") {
    return null;
  }

  let pos = ctx.pos + 1;
  let consumed = 1;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || !isDivBlockName(nameResult.name)) {
    return null;
  }

  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  const attrResult = parseAttributes(ctx, pos);
  pos += attrResult.consumed;
  consumed += attrResult.consumed;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  pos++;
  consumed++;

  const hasRequiredNewline = ctx.tokens[pos]?.type === "NEWLINE";
  if (hasRequiredNewline) {
    pos++;
    consumed++;
  }

  return {
    blockName: nameResult.name,
    paragraphStrip: nameResult.name === "div_",
    attributes: attrResult.attrs,
    bodyStart: pos,
    consumed,
    hasRequiredNewline,
  };
}

function isDivBlockName(name: string): name is "div" | "div_" {
  return name === "div" || name === "div_";
}
