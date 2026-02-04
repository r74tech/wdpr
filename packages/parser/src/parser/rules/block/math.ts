import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlockName } from "./utils";

export const mathBlockRule: BlockRule = {
  name: "math",
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
    if (!nameResult || nameResult.name.toLowerCase() !== "math") {
      return { success: false };
    }
    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse optional name
    let name: string | null = null;
    const nameToken = ctx.tokens[pos];
    if (nameToken?.type === "IDENTIFIER" || nameToken?.type === "TEXT") {
      let nameParts = "";
      while (pos < ctx.tokens.length) {
        const token = ctx.tokens[pos];
        if (
          !token ||
          token.type === "BLOCK_CLOSE" ||
          token.type === "WHITESPACE" ||
          token.type === "NEWLINE"
        ) {
          break;
        }
        nameParts += token.value;
        pos++;
        consumed++;
      }
      if (nameParts) {
        name = nameParts;
      }
    }

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
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

    // Collect LaTeX content until [[/math]]
    // BACKSLASH_BREAK (U+E000) was created by preprocessing from "\\\n"
    // In math blocks, we need to restore this as "\\\n" for LaTeX line breaks
    let latexSource = "";

    while (pos < ctx.tokens.length) {
      const token = ctx.tokens[pos];
      if (!token) break;

      // Check for closing [[/math]]
      if (token.type === "BLOCK_END_OPEN") {
        const closeNameResult = parseBlockName(ctx, pos + 1);
        if (closeNameResult?.name.toLowerCase() === "math") {
          break;
        }
      }

      // Restore BACKSLASH_BREAK to original "\\\n" for LaTeX
      if (token.type === "BACKSLASH_BREAK") {
        latexSource += "\\\n";
      } else {
        latexSource += token.value;
      }
      pos++;
      consumed++;
    }

    // Consume [[/math]]
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

    // Trim the LaTeX source
    latexSource = latexSource.trim();

    // Empty math is invalid
    if (!latexSource) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "math",
          data: {
            name,
            "latex-source": latexSource,
          },
        },
      ],
      consumed,
    };
  },
};
