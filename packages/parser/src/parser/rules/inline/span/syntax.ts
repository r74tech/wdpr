import type { ParseContext } from "../../types";
import { parseBlockName } from "../../common";
import { parseAttributes } from "../../block/utils";

export type SpanBlockName = "span" | "span_";

export type SpanOpenerResult =
  | {
      success: true;
      blockName: SpanBlockName;
      attributes: Record<string, string>;
      pos: number;
      consumed: number;
    }
  | { success: false };

export type CloseSpanResult = { success: true; consumed: number } | { success: false };

export function parseSpanOpener(ctx: ParseContext): SpanOpenerResult {
  let pos = ctx.pos + 1;
  let consumed = 1;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || (nameResult.name !== "span" && nameResult.name !== "span_")) {
    return { success: false };
  }

  const blockName = nameResult.name;
  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  const attrResult = parseAttributes(ctx, pos);
  pos += attrResult.consumed;
  consumed += attrResult.consumed;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return { success: false };
  }
  pos++;
  consumed++;

  return {
    success: true,
    blockName,
    attributes: attrResult.attrs,
    pos,
    consumed,
  };
}

export function parseCloseSpan(ctx: ParseContext, startPos: number): CloseSpanResult {
  const token = ctx.tokens[startPos];
  if (token?.type !== "BLOCK_END_OPEN") {
    return { success: false };
  }

  const nameResult = parseBlockName(ctx, startPos + 1);
  if (!nameResult || nameResult.name !== "span") {
    return { success: false };
  }

  let pos = startPos + 1 + nameResult.consumed;
  let consumed = 1 + nameResult.consumed;

  if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
    consumed++;
  }

  return { success: true, consumed };
}
