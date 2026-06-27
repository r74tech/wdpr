import type { ParseContext } from "../../types";
import { currentToken } from "../../types";
import { parseBlockName } from "../utils";

export interface ModuleBodyResult {
  body?: string;
  pos: number;
  consumed: number;
}

export function parseModuleBody(
  ctx: ParseContext,
  startPos: number,
  moduleHasBody: boolean,
): ModuleBodyResult {
  if (!moduleHasBody || ctx.tokens[startPos]?.type !== "NEWLINE") {
    return { pos: startPos, consumed: 0 };
  }

  let pos = startPos + 1;
  let consumed = 1;
  const bodyParts: string[] = [];
  let foundClose = false;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    if (token.type === "BLOCK_END_OPEN") {
      const closeResult = parseModuleClose(ctx, pos);
      if (closeResult) {
        foundClose = true;
        pos = closeResult.pos;
        consumed += closeResult.consumed;
        break;
      }
    }

    bodyParts.push(token.value);
    pos++;
    consumed++;
  }

  if (!foundClose) {
    ctx.diagnostics.push({
      severity: "warning",
      code: "unclosed-block",
      message: "Missing closing tag [[/module]] for [[module]]",
      position: currentToken(ctx).position,
    });
  }

  const trimmed = bodyParts.join("").trim();
  return {
    body: trimmed ? trimmed : undefined,
    pos,
    consumed,
  };
}

function parseModuleClose(
  ctx: ParseContext,
  startPos: number,
): { pos: number; consumed: number } | null {
  if (ctx.tokens[startPos]?.type !== "BLOCK_END_OPEN") {
    return null;
  }

  const closeNameResult = parseBlockName(ctx, startPos + 1);
  if (
    !closeNameResult ||
    (closeNameResult.name !== "module" && closeNameResult.name !== "module654")
  ) {
    return null;
  }

  let pos = startPos + 1 + closeNameResult.consumed;
  let consumed = 1 + closeNameResult.consumed;

  if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
    pos++;
    consumed++;
  }
  if (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  return { pos, consumed };
}
