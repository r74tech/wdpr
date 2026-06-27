import type { ParseContext } from "../../types";

export interface IftagsConditionResult {
  condition: string;
  consumed: number;
}

export function collectIftagsCondition(ctx: ParseContext, startPos: number): IftagsConditionResult {
  let condition = "";
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "BLOCK_CLOSE" || token.type === "NEWLINE") {
      break;
    }
    condition += token.value;
    pos++;
    consumed++;
  }

  return { condition, consumed };
}
