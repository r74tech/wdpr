import type { Element } from "@wdprlib/ast";
import { STYLE_SLOT_PREFIX } from "@wdprlib/ast";
import { mapElementChildren } from "../walk";
import type { IfTagsData } from "../iftags/resolve";

type IfTagsDataWithStyleSlot = IfTagsData & {
  _styleSlot: number;
};

/**
 * Collect and remove style elements from the AST.
 *
 * Unresolved `if-tags` elements receive style-slot placeholders so render-time
 * iftags evaluation can preserve style order relative to already collected CSS.
 */
export function collectStyles(elements: Element[]): { elements: Element[]; styles: string[] } {
  const styles: string[] = [];
  const ctx = { nextSlotId: 0 };
  const filtered = collectStylesFromElements(elements, styles, ctx);
  return { elements: filtered, styles };
}

function collectStylesFromElements(
  elements: Element[],
  styles: string[],
  ctx: { nextSlotId: number },
): Element[] {
  const result: Element[] = [];

  for (const element of elements) {
    if (element.element === "style") {
      styles.push(element.data as string);
      continue;
    }

    if (element.element === "if-tags") {
      const slotId = ctx.nextSlotId++;
      styles.push(`${STYLE_SLOT_PREFIX}${slotId}`);
      const data: IfTagsDataWithStyleSlot = { ...(element.data as IfTagsData), _styleSlot: slotId };
      result.push({
        element: "if-tags",
        data,
      });
      continue;
    }

    result.push(
      mapElementChildren(element, (children) => collectStylesFromElements(children, styles, ctx)),
    );
  }

  return result;
}
