import type { Element } from "@wdprlib/ast";
import type { ParseContext, RuleResult } from "../../types";
import { parseAttributes, parseBlockName } from "../utils";

/**
 * Handles the case where `[[div]]` fails as a block element because
 * the closing `]]` is not followed by a NEWLINE.
 */
export function consumeFailedDiv(ctx: ParseContext): RuleResult<Element> {
  const elements: Element[] = [];
  let pos = ctx.pos;
  let consumed = 0;
  let lastClosePos = -1;
  let lastCloseConsumed = 0;

  let scanPos = pos;
  while (scanPos < ctx.tokens.length) {
    const t = ctx.tokens[scanPos];
    if (!t || t.type === "EOF") break;

    if (t.type === "BLOCK_OPEN" && t.lineStart && scanPos > pos) {
      const nameResult = parseBlockName(ctx, scanPos + 1);
      if (nameResult?.name === "div" || nameResult?.name === "div_") {
        let checkPos = scanPos + 1 + nameResult.consumed;
        const attrResult = parseAttributes(ctx, checkPos);
        checkPos += attrResult.consumed;
        if (ctx.tokens[checkPos]?.type === "BLOCK_CLOSE") {
          checkPos++;
          if (ctx.tokens[checkPos]?.type === "NEWLINE" || ctx.tokens[checkPos]?.type === "EOF") {
            break;
          }
        }
      }
    }

    if (t.type === "BLOCK_END_OPEN") {
      const nameResult = parseBlockName(ctx, scanPos + 1);
      if (nameResult?.name === "div") {
        lastClosePos = scanPos;
        lastCloseConsumed = 1 + nameResult.consumed;
        const closeToken = ctx.tokens[scanPos + 1 + nameResult.consumed];
        if (closeToken?.type === "BLOCK_CLOSE") {
          lastCloseConsumed++;
        }
      }
    }
    scanPos++;
  }

  if (lastClosePos === -1) {
    return { success: false };
  }

  const endPosForDiag = lastClosePos;
  for (let diagPos = ctx.pos; diagPos < endPosForDiag; diagPos++) {
    const t = ctx.tokens[diagPos];
    if (t?.type === "BLOCK_OPEN") {
      const nameResult = parseBlockName(ctx, diagPos + 1);
      if (nameResult?.name === "div" || nameResult?.name === "div_") {
        if (t.position) {
          ctx.diagnostics.push({
            severity: "error",
            code: "inline-block-element",
            message: `[[${nameResult.name}]] must be followed by a newline to be a block element`,
            position: t.position,
          });
        }
      }
    }
  }

  const endPos = lastClosePos + lastCloseConsumed;
  while (pos < endPos && pos < ctx.tokens.length) {
    const t = ctx.tokens[pos];
    if (!t || t.type === "EOF") break;

    if (t.type === "NEWLINE") {
      let peekPos = pos + 1;
      while (ctx.tokens[peekPos]?.type === "WHITESPACE") peekPos++;
      if (ctx.tokens[peekPos]?.type === "NEWLINE") {
        while (ctx.tokens[pos]?.type === "NEWLINE" || ctx.tokens[pos]?.type === "WHITESPACE") {
          pos++;
          consumed++;
        }
        continue;
      }
      elements.push({ element: "line-break" });
      pos++;
      consumed++;
      continue;
    }

    elements.push({ element: "text", data: t.value });
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  return {
    success: true,
    elements: [
      {
        element: "container",
        data: {
          type: "paragraph",
          attributes: {},
          elements,
        },
      },
    ],
    consumed,
  };
}
