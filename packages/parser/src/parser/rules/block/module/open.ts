import type { ParseContext } from "../../types";
import { parseAttributesRaw, parseBlockName } from "../utils";

export interface ModuleOpenResult {
  moduleName: string;
  attrs: Record<string, string>;
  pos: number;
  consumed: number;
}

export function parseModuleOpen(ctx: ParseContext): ModuleOpenResult | null {
  if (ctx.tokens[ctx.pos]?.type !== "BLOCK_OPEN") {
    return null;
  }

  let pos = ctx.pos + 1;
  let consumed = 1;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || (nameResult.name !== "module" && nameResult.name !== "module654")) {
    return null;
  }

  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const nameToken = ctx.tokens[pos];
  const moduleName =
    nameToken?.type === "TEXT" || nameToken?.type === "IDENTIFIER" ? nameToken.value : "";
  if (moduleName) {
    pos++;
    consumed++;
  }

  const attrResult = parseAttributesRaw(ctx, pos);
  pos += attrResult.consumed;
  consumed += attrResult.consumed;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  pos++;
  consumed++;

  return {
    moduleName,
    attrs: attrResult.attrs,
    pos,
    consumed,
  };
}
