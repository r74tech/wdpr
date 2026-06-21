/**
 *
 * Block rule for the Wikidot code block: `[[code]]...[[/code]]`.
 *
 * A code block captures its body as raw text (no inline parsing) and
 * supports two optional attributes:
 * - `type` -- the programming language for syntax highlighting.
 * - `name` -- a label or filename displayed alongside the code.
 *
 * @module
 */
import type { Element, CodeBlockData } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseBlockName } from "../utils";
import { parseAttributesRaw } from "../utils";
import { repairSwallowedCodeClose } from "./attributes";
import { collectCodeContent } from "./content";

/**
 * Block rule for `[[code type="..." name="..."]]...[[/code]]`.
 *
 * Body content is stored as-is (not parsed for inline markup). The rule
 * also registers the code block in `ctx.codeBlocks` for document-level
 * introspection.
 */
export const codeBlockRule: BlockRule = {
  name: "code",
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
    if (!nameResult || nameResult.name !== "code") {
      return { success: false };
    }

    pos += nameResult.consumed;
    consumed += nameResult.consumed;

    const attrResult = parseAttributesRaw(ctx, pos);
    pos += attrResult.consumed;
    consumed += attrResult.consumed;

    let closingSwallowed = false;
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      const repaired = repairSwallowedCodeClose(ctx, pos, attrResult.attrs);
      if (!repaired) return { success: false };
      closingSwallowed = repaired.closingSwallowed;
    } else {
      pos++;
      consumed++;
    }

    if (ctx.tokens[pos]?.type === "NEWLINE") {
      pos++;
      consumed++;
    }

    const contentResult = collectCodeContent(ctx, pos, closingSwallowed);
    let codeContent = contentResult.contents.replace(/\n$/, "");
    consumed += contentResult.consumed;
    pos += contentResult.consumed;

    if (!contentResult.foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/code]] for [[code]]",
        position: openToken.position,
      });
    }

    const codeBlockData: CodeBlockData = {
      contents: codeContent,
      language: attrResult.attrs.type ?? null,
      name: attrResult.attrs.name ?? null,
    };
    ctx.codeBlocks.push(codeBlockData);

    return {
      success: true,
      elements: [
        {
          element: "code",
          data: codeBlockData,
        },
      ],
      consumed,
    };
  },
};
