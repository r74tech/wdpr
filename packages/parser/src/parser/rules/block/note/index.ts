import type { BlockRule } from "../../types";
import { parseBlocksUntil } from "../parsing/content";
import { findNoteBounds } from "./boundary";

const excludedBlockNames = new Set(["note"]);

export const noteRule: BlockRule = {
  name: "note",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: false,
  parse(ctx) {
    const bounds = findNoteBounds(ctx);
    if (!bounds) return { success: false };
    const body = parseBlocksUntil(
      {
        ...ctx,
        tokens: ctx.tokens.slice(bounds.bodyStart, bounds.close),
        pos: 0,
        scope: {
          ...ctx.scope,
          inlineEnd: undefined,
          tableFormatting: undefined,
          blockCloseCondition: undefined,
        },
      },
      () => false,
      { excludedBlockNames },
    );
    return {
      success: true,
      consumed: bounds.end - ctx.pos,
      elements: [
        { element: "container", data: { type: "note", attributes: {}, elements: body.elements } },
      ],
    };
  },
};
