import type { Element, TabData } from "@wdpr/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName, parseBlocksUntil } from "./utils";

/**
 * Parse a single [[tab label]]...[[/tab]] block
 */
function parseTab(ctx: ParseContext): { tab: TabData; consumed: number } | null {
  let pos = ctx.pos;
  let consumed = 0;

  // Skip whitespace/newlines before tab
  while (ctx.tokens[pos]?.type === "WHITESPACE" || ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  // Expect [[
  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") {
    return null;
  }
  pos++;
  consumed++;

  // Parse block name
  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || nameResult.name.toLowerCase() !== "tab") {
    return null;
  }
  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  // Parse label (everything until ]])
  let label = "";
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token) break;
    if (token.type === "BLOCK_CLOSE") {
      break;
    }
    if (token.type === "NEWLINE") {
      // No newline allowed in label
      return null;
    }
    // Skip leading whitespace in label
    if (label === "" && token.type === "WHITESPACE") {
      pos++;
      consumed++;
      continue;
    }
    label += token.value;
    pos++;
    consumed++;
  }

  // Expect ]]
  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }
  pos++;
  consumed++;

  // Skip newline after opening tag
  if (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  // Close condition for [[/tab]]
  const closeCondition = (checkCtx: ParseContext): boolean => {
    const token = checkCtx.tokens[checkCtx.pos];
    if (token?.type === "BLOCK_END_OPEN") {
      const closeNameResult = parseBlockName(checkCtx, checkCtx.pos + 1);
      if (closeNameResult?.name.toLowerCase() === "tab") {
        return true;
      }
    }
    return false;
  };

  // Parse body
  const bodyCtx: ParseContext = { ...ctx, pos };
  const bodyResult = parseBlocksUntil(bodyCtx, closeCondition);
  consumed += bodyResult.consumed;
  pos += bodyResult.consumed;

  // Consume [[/tab]]
  if (ctx.tokens[pos]?.type === "BLOCK_END_OPEN") {
    pos++;
    consumed++;
    const closeNameResult = parseBlockName(ctx, pos);
    if (closeNameResult) {
      pos += closeNameResult.consumed;
      consumed += closeNameResult.consumed;
    }
    if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
      pos++;
      consumed++;
    }
    // Skip trailing newline
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }
  }

  // Default label if empty
  const finalLabel = label.trim() || "untitled";

  return {
    tab: {
      label: finalLabel,
      elements: bodyResult.elements,
    },
    consumed,
  };
}

export const tabviewRule: BlockRule = {
  name: "tabview",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse block name
    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult) {
      return { success: false };
    }

    const blockName = nameResult.name.toLowerCase();
    // Accept tabview or tabs
    if (blockName !== "tabview" && blockName !== "tabs") {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Skip any attributes/name (Wikidot ignores [[tabview Foo]])
    while (
      pos < ctx.tokens.length &&
      ctx.tokens[pos]?.type !== "BLOCK_CLOSE" &&
      ctx.tokens[pos]?.type !== "NEWLINE"
    ) {
      pos++;
      consumed++;
    }

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip newline after opening tag
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    // Parse tabs
    const tabs: TabData[] = [];
    const tabCtx: ParseContext = { ...ctx, pos };

    while (pos < ctx.tokens.length) {
      // Check for closing [[/tabview]] or [[/tabs]]
      if (ctx.tokens[pos]?.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        const closeName = closeNameResult?.name.toLowerCase();
        if (closeName === "tabview" || closeName === "tabs") {
          break;
        }
      }

      // Try to parse a tab
      const tabResult = parseTab({ ...tabCtx, pos });
      if (tabResult) {
        tabs.push(tabResult.tab);
        pos += tabResult.consumed;
        consumed += tabResult.consumed;
      } else {
        // Skip whitespace/newlines between tabs
        if (ctx.tokens[pos]?.type === "WHITESPACE" || ctx.tokens[pos]?.type === "NEWLINE") {
          pos++;
          consumed++;
        } else {
          // Non-tab content in tabview - fail
          return { success: false };
        }
      }
    }

    // Consume [[/tabview]] or [[/tabs]]
    if (ctx.tokens[pos]?.type === "BLOCK_END_OPEN") {
      pos++;
      consumed++;
      const closeNameResult = parseBlockName(ctx, pos);
      if (closeNameResult) {
        pos += closeNameResult.consumed;
        consumed += closeNameResult.consumed;
      }
      if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
        pos++;
        consumed++;
      }
      if (ctx.tokens[pos]?.type === "NEWLINE") {
        pos++;
        consumed++;
      }
    }

    // Empty tabview is invalid
    if (tabs.length === 0) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "tab-view",
          data: tabs,
        },
      ],
      consumed,
    };
  },
};
