import type { AttributeMap } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseAttributesRaw } from "../../block/utils";
import { filterUnsafeAttributes } from "../../common";

export interface ImageAttributes {
  attributes: AttributeMap;
  link: string | null;
  consumed: number;
}

export function parseImageAttributes(ctx: ParseContext, startPos: number): ImageAttributes {
  const result = parseAttributesRaw(ctx, startPos, false);
  const link = result.attrs.link ?? null;
  const { link: _link, ...htmlAttributes } = result.attrs;

  return {
    attributes: filterUnsafeAttributes(htmlAttributes),
    link,
    consumed: result.consumed,
  };
}
