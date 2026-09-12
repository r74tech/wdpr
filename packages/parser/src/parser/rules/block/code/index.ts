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
import { findCodeOpen } from "./open";
import { parseAttributesRaw } from "../utils";
import { repairSwallowedCodeClose } from "./attributes";
import { parseInlineUntil } from "../../inline/utils";
import { getParagraphNewlineBoundary } from "../../inline/parsing/paragraph-boundary";
import { normalizeParagraphElements } from "../paragraph/normalize";
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

    const open = findCodeOpen(ctx.tokens, ctx.pos);
    if (!open) return { success: false };
    const attrResult = parseAttributesRaw(ctx, ctx.pos + 2);
    if (open.repaired) repairSwallowedCodeClose(ctx, open.attributesEnd, attrResult.attrs);
    let pos = open.bodyStart;
    let consumed = pos - ctx.pos;

    const contentResult = collectCodeContent(ctx, pos, open.closingSwallowed);
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

    const elements: Element[] = [{ element: "code", data: codeBlockData }];
    if (
      ctx.tokens[pos]?.type === "NEWLINE" &&
      !getParagraphNewlineBoundary(ctx, pos, false).shouldBreak &&
      !ctx.scope.blockCloseCondition?.({ ...ctx, pos: pos + 1 })
    ) {
      const after = parseInlineUntil({ ...ctx, pos: pos + 1 }, "PARAGRAPH_BREAK");
      elements.push({ element: "line-break" }, ...normalizeParagraphElements(after.elements));
      consumed += 1 + after.consumed;
    }
    return { success: true, elements, consumed };
  },
};
