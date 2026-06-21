/**
 *
 * Block rule for the Wikidot math block: `[[math name]]...[[/math]]`.
 *
 * A math block captures LaTeX source code between the tags and stores it
 * as a `math` element in the AST. The content is not parsed for inline
 * markup.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseBlockName } from "../utils";
import { collectMathContent, consumeMathClose } from "./content";
import { parseMathName } from "./name";

/**
 * Block rule for `[[math name]]...[[/math]]`.
 *
 * Content is captured as raw LaTeX source. BACKSLASH_BREAK tokens are
 * restored to their original `\\\n` form for correct LaTeX rendering.
 */
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

    const nameResult = parseBlockName(ctx, pos);
    if (!nameResult || nameResult.name !== "math") {
      return { success: false };
    }
    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    const mathName = parseMathName(ctx, pos);
    pos += mathName.consumed;
    consumed += mathName.consumed;

    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    const contentResult = collectMathContent(ctx, pos);
    const latexSource = contentResult.latexSource.trim();
    consumed += contentResult.consumed;
    pos += contentResult.consumed;

    if (!contentResult.foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/math]] for [[math]]",
        position: openToken.position,
      });
    } else {
      const closeConsumed = consumeMathClose(ctx, pos);
      pos += closeConsumed;
      consumed += closeConsumed;
    }

    if (!latexSource) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "math",
          data: {
            name: mathName.name,
            "latex-source": latexSource,
          },
        },
      ],
      consumed,
    };
  },
};
