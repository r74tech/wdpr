import type { TabData } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseTab } from "./tab";
import { consumeNamedCloseTag, isTabviewClose } from "./tags";

export interface TabviewBodyResult {
  tabs: TabData[];
  consumed: number;
  closeConsumed: number;
  foundClose: boolean;
  invalidContent: boolean;
}

export function collectTabviewBody(ctx: ParseContext, startPos: number): TabviewBodyResult {
  const tabs: TabData[] = [];
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    if (ctx.tokens[pos]?.type === "EOF") {
      break;
    }

    if (isTabviewClose(ctx, pos)) {
      return {
        tabs,
        consumed,
        closeConsumed: consumeNamedCloseTag(ctx, pos),
        foundClose: true,
        invalidContent: false,
      };
    }

    const tabResult = parseTab({ ...ctx, pos });
    if (tabResult) {
      tabs.push(tabResult.tab);
      pos += tabResult.consumed;
      consumed += tabResult.consumed;
      continue;
    }

    if (ctx.tokens[pos]?.type === "WHITESPACE" || ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
      continue;
    }

    return {
      tabs,
      consumed,
      closeConsumed: 0,
      foundClose: false,
      invalidContent: true,
    };
  }

  return {
    tabs,
    consumed,
    closeConsumed: 0,
    foundClose: false,
    invalidContent: false,
  };
}
