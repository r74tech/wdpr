import type { Element, PageRef, VariableMap } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "./utils";

/**
 * Parse page reference from include target
 * Formats:
 *   - "page" -> { site: null, page: "page" }
 *   - ":site:page" -> { site: "site", page: "page" }
 *   - "fragment:name" -> { site: null, page: "fragment:name" }
 */
function parsePageRef(target: string): PageRef {
  // Check for :site:page format
  if (target.startsWith(":")) {
    const rest = target.slice(1);
    const colonIndex = rest.indexOf(":");
    if (colonIndex !== -1) {
      return {
        site: rest.slice(0, colonIndex),
        page: rest.slice(colonIndex + 1),
      };
    }
  }
  return { site: null, page: target };
}

/**
 * Parse variables from include arguments
 * Format: key=value separated by |
 */
function parseVariables(tokens: string[]): VariableMap {
  const vars: VariableMap = {};

  let current = "";
  for (const token of tokens) {
    if (token === "|") {
      if (current.trim()) {
        const eqIndex = current.indexOf("=");
        if (eqIndex !== -1) {
          const key = current.slice(0, eqIndex).trim();
          const value = current.slice(eqIndex + 1).trim();
          if (key) {
            vars[key] = value;
          }
        }
      }
      current = "";
    } else {
      current += token;
    }
  }

  // Handle last segment
  if (current.trim()) {
    const eqIndex = current.indexOf("=");
    if (eqIndex !== -1) {
      const key = current.slice(0, eqIndex).trim();
      const value = current.slice(eqIndex + 1).trim();
      if (key) {
        vars[key] = value;
      }
    }
  }

  return vars;
}

export const includeRule: BlockRule = {
  name: "include",
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
    if (!nameResult || nameResult.name.toLowerCase() !== "include") {
      return { success: false };
    }

    // Page syntax disabled (e.g., forum-post mode)
    if (!ctx.settings.enablePageSyntax) {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Collect target and arguments until ]]
    const argTokens: string[] = [];
    let target = "";
    let inTarget = true;

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token) break;

      if (token.type === "BLOCK_CLOSE") {
        break;
      }

      // Newlines are allowed in include arguments
      if (token.type === "NEWLINE") {
        pos++;
        consumed++;
        continue;
      }

      if (inTarget) {
        // First non-whitespace segment is the target
        if (token.type === "WHITESPACE") {
          if (target) {
            inTarget = false;
          }
        } else if (token.type === "PIPE") {
          inTarget = false;
          argTokens.push("|");
        } else {
          target += token.value;
        }
      } else {
        argTokens.push(token.value);
      }

      pos++;
      consumed++;
    }

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip trailing newline
    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    if (!target) {
      return { success: false };
    }

    const location = parsePageRef(target);
    const variables = parseVariables(argTokens);

    return {
      success: true,
      elements: [
        {
          element: "include",
          data: {
            "paragraph-safe": false,
            variables,
            location,
            elements: [],
          },
        },
      ],
      consumed,
    };
  },
};
