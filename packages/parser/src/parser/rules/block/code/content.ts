import type { ParseContext } from "../../types";
import { findCodeBodyBounds } from "./boundary";

export interface CodeContentResult {
  contents: string;
  consumed: number;
  foundClose: boolean;
}

export function collectCodeContent(
  ctx: ParseContext,
  startPos: number,
  closingSwallowed: boolean,
): CodeContentResult {
  if (closingSwallowed) return { contents: "", consumed: 0, foundClose: true };
  const bounds = findCodeBodyBounds(ctx.tokens, startPos);
  return {
    contents: ctx.tokens
      .slice(startPos, bounds.closeStart)
      .map((token) => token.value)
      .join(""),
    consumed: bounds.end - startPos,
    foundClose: bounds.foundClose,
  };
}
