import type { ParseContext } from "../../types";

export interface IncludeArguments {
  target: string;
  argumentTokens: string[];
  consumed: number;
}

export function collectIncludeArguments(ctx: ParseContext, startPos: number): IncludeArguments {
  const argumentTokens: string[] = [];
  let target = "";
  let inTarget = true;
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "BLOCK_CLOSE") {
      break;
    }

    if (token.type === "NEWLINE") {
      pos++;
      consumed++;
      continue;
    }

    if (inTarget) {
      if (token.type === "WHITESPACE") {
        if (target) {
          inTarget = false;
        }
      } else if (token.type === "PIPE") {
        inTarget = false;
        argumentTokens.push("|");
      } else {
        target += token.value;
      }
    } else {
      argumentTokens.push(token.value);
    }

    pos++;
    consumed++;
  }

  return { target, argumentTokens, consumed };
}
