import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "./utils";

/**
 * Orphan li rule for [[li]]...[[/li]] outside of [[ul]]/[[ol]]
 *
 * Wikidot behavior: When [[li]] appears outside of a list block,
 * it's treated as plain text (not parsed as a list item).
 * The content is rendered without <p> tags, with <br /> for newlines.
 *
 * Example:
 *   [[li]]
 *   Baz
 *   [[/li]]
 *
 * Outputs: [[li]]<br />Baz<br />[[/li]]
 */

/**
 * Check if the next tokens form [[li]] open tag (not [[li_]])
 */
function isLiOpen(ctx: ParseContext, pos: number): { consumed: number } | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") return null;
  const nameResult = parseBlockName(ctx, pos + 1);
  if (!nameResult) return null;
  if (nameResult.name === "li") {
    return { consumed: 1 + nameResult.consumed };
  }
  return null;
}

/**
 * Check if the next tokens form [[/li]] close tag
 */
function isLiClose(ctx: ParseContext, pos: number): { consumed: number } | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") return null;
  const nameResult = parseBlockName(ctx, pos + 1);
  if (!nameResult || nameResult.name !== "li") return null;
  let consumed = 1 + nameResult.consumed;
  if (ctx.tokens[pos + consumed]?.type === "BLOCK_CLOSE") consumed++;
  return { consumed };
}

export const orphanLiRule: BlockRule = {
  name: "orphan-li",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    // Check for [[li]] (not [[li_]])
    const liOpen = isLiOpen(ctx, ctx.pos);
    if (!liOpen) {
      return { success: false };
    }

    let pos = ctx.pos + liOpen.consumed;
    let consumed = liOpen.consumed;

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Collect content until [[/li]]
    const elements: Element[] = [];

    // Output [[li]] as text
    elements.push({ element: "text", data: "[[" });
    elements.push({ element: "text", data: "li" });
    elements.push({ element: "text", data: "]]" });

    // Wikidot outputs: [[li]]<br />Baz<br />[[/li]]
    // - Newline after [[li]] becomes <br />
    // - Newline after content becomes <br />
    // - No <br /> right before [[/li]]

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token || token.type === "EOF") break;

      // Check for [[/li]] close
      const liClose = isLiClose(ctx, pos);
      if (liClose) {
        // Output [[/li]] as text (no <br /> before it)
        elements.push({ element: "text", data: "[[/" });
        elements.push({ element: "text", data: "li" });
        elements.push({ element: "text", data: "]]" });
        consumed += liClose.consumed;
        pos += liClose.consumed;
        // Skip trailing newline
        if (ctx.tokens[pos]?.type === "NEWLINE") {
          pos++;
          consumed++;
        }
        break;
      }

      // Handle newlines - convert to <br />
      if (token.type === "NEWLINE") {
        elements.push({ element: "line-break" });
        pos++;
        consumed++;
        continue;
      }

      // Skip leading whitespace on lines
      if (token.type === "WHITESPACE" && token.lineStart) {
        pos++;
        consumed++;
        continue;
      }

      // Other content
      elements.push({ element: "text", data: token.value });
      pos++;
      consumed++;
    }

    return {
      success: true,
      elements,
      consumed,
    };
  },
};
