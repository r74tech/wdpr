import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseInlineUntil } from "../../inline/utils";

export interface ParagraphContentResult {
  elements: Element[];
  consumed: number;
}

export function parseInlineContent(ctx: ParseContext): ParagraphContentResult {
  return parseInlineUntil(ctx, "PARAGRAPH_BREAK");
}
