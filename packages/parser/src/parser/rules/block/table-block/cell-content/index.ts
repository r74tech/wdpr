import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../../types";
import { getCandidateInlineRules } from "../../../inline/utils";
import { getCandidateBlockRules } from "../../utils";
import { createCellContentAccumulator, unwrapSingleInlineParagraph } from "./segments";
import { consumeCellContentNewline } from "../cell-newline";

export interface CellContentResult {
  elements: Element[];
  consumed: number;
  hadParagraphBreaks: boolean;
}

export { unwrapSingleInlineParagraph };

export function parseCellContent(
  ctx: ParseContext,
  closeCondition: (ctx: ParseContext) => boolean,
): CellContentResult {
  const content = createCellContentAccumulator();
  let consumed = 0;
  let pos = ctx.pos;
  const checkCtx: ParseContext = { ...ctx, pos };
  const blockCtx: ParseContext = { ...ctx, pos };
  const inlineCtx: ParseContext = { ...ctx, pos };

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    checkCtx.pos = pos;
    if (closeCondition(checkCtx)) {
      break;
    }

    if (token.type === "NEWLINE") {
      const newlineResult = consumeCellContentNewline(ctx, pos, content);
      consumed += newlineResult.consumed;
      pos += newlineResult.consumed;
      continue;
    }

    if (token.type === "WHITESPACE" && token.lineStart) {
      pos++;
      consumed++;
      continue;
    }

    let matched = false;
    blockCtx.pos = pos;

    for (const rule of getCandidateBlockRules(ctx.blockRules, token)) {
      const result = rule.parse(blockCtx);
      if (result.success) {
        content.addBlockElements(result.elements);
        consumed += result.consumed;
        pos += result.consumed;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    inlineCtx.pos = pos;

    for (const rule of getCandidateInlineRules(ctx.inlineRules, token.type)) {
      const result = rule.parse(inlineCtx);
      if (result.success) {
        content.addInlineElements(result.elements, result.stripLeadingLineBreak);
        consumed += result.consumed;
        pos += result.consumed;
        matched = true;
        break;
      }
    }

    if (!matched) {
      content.addInline({ element: "text", data: token.value });
      consumed++;
      pos++;
    }
  }

  return { ...content.finish(), consumed };
}
