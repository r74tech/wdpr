import type { TabData } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBlockName, parseBlocksUntil } from "../utils";
import { consumeNamedCloseTag, isTabClose } from "./tags";

/**
 * Parses a single `[[tab Label]]...[[/tab]]` block within a tabview.
 */
export function parseTab(ctx: ParseContext): { tab: TabData; consumed: number } | null {
  let pos = ctx.pos;
  let consumed = 0;

  while (ctx.tokens[pos]?.type === "WHITESPACE" || ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") {
    return null;
  }
  pos++;
  consumed++;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || nameResult.name.toLowerCase() !== "tab") {
    return null;
  }
  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  let label = "";
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token) break;
    if (token.type === "BLOCK_CLOSE") {
      break;
    }
    if (token.type === "NEWLINE") {
      return null;
    }
    if (label === "" && token.type === "WHITESPACE") {
      pos++;
      consumed++;
      continue;
    }
    label += token.value;
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }
  pos++;
  consumed++;

  if (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  const bodyCtx: ParseContext = { ...ctx, pos };
  const bodyResult = parseBlocksUntil(bodyCtx, (checkCtx) => isTabClose(checkCtx, checkCtx.pos));
  consumed += bodyResult.consumed;
  pos += bodyResult.consumed;

  if (!isTabClose(ctx, pos)) {
    ctx.diagnostics.push({
      severity: "warning",
      code: "unclosed-block",
      message: "Missing closing tag [[/tab]] for [[tab]]",
      position: ctx.tokens[ctx.pos]?.position ?? {
        start: { line: 0, column: 0, offset: 0 },
        end: { line: 0, column: 0, offset: 0 },
      },
    });
  }

  if (isTabClose(ctx, pos)) {
    const closeConsumed = consumeNamedCloseTag(ctx, pos);
    pos += closeConsumed;
    consumed += closeConsumed;
  }

  return {
    tab: {
      label: label.trim() || "untitled",
      elements: bodyResult.elements,
    },
    consumed,
  };
}
