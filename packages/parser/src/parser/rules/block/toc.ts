/**
 * Table of contents rule: [[toc]], [[f<toc ...]], [[f>toc ...]]
 *
 * Variants:
 * - [[toc]] - basic TOC
 * - [[f<toc ...]] - float left
 * - [[f>toc ...]] - float right
 *
 * Note: Wikidot ignores attributes on [[toc]] (class, style, id are not applied)
 * [[>toc]] and [[<toc]] are invalid in Wikidot and not supported.
 */
import type { Alignment, Element } from "@wdpr/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Skip tokens until BLOCK_CLOSE (Wikidot ignores toc attributes)
 */
function skipUntilClose(ctx: ParseContext, startPos: number): number {
  let pos = startPos;
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "BLOCK_CLOSE" ||
      token.type === "NEWLINE" ||
      token.type === "EOF"
    ) {
      break;
    }
    pos++;
  }
  return pos;
}

export const tocRule: BlockRule = {
  name: "toc",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let align: Alignment | null = null;

    // Skip whitespace after [[
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
    }

    const firstToken = ctx.tokens[pos];
    if (!firstToken || (firstToken.type !== "TEXT" && firstToken.type !== "IDENTIFIER")) {
      return { success: false };
    }

    const firstValue = firstToken.value.toLowerCase();

    if (firstValue === "toc") {
      // [[toc ...]]
      pos++;
    } else if (firstValue === "f") {
      // Possibly [[f<toc ...]] or [[f>toc ...]]
      pos++;
      const dirToken = ctx.tokens[pos];
      if (!dirToken) {
        return { success: false };
      }

      if (dirToken.type === "TEXT" && dirToken.value === "<") {
        align = "left";
        pos++;
      } else if (dirToken.type === "TEXT" && dirToken.value === ">") {
        align = "right";
        pos++;
      } else {
        return { success: false };
      }

      // Now expect "toc"
      const tocToken = ctx.tokens[pos];
      if (!tocToken || (tocToken.type !== "TEXT" && tocToken.type !== "IDENTIFIER")) {
        return { success: false };
      }
      if (tocToken.value.toLowerCase() !== "toc") {
        return { success: false };
      }
      pos++;
    } else {
      return { success: false };
    }

    // Skip any tokens until ]] (Wikidot ignores toc attributes)
    pos = skipUntilClose(ctx, pos);

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;

    const consumed = pos - ctx.pos;

    return {
      success: true,
      elements: [
        {
          element: "table-of-contents",
          data: {
            attributes: {},
            align,
          },
        },
      ],
      consumed,
    };
  },
};
