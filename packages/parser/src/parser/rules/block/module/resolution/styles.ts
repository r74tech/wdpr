import type { Element } from "@wdprlib/ast";
import { STYLE_ANCHOR_PREFIX, STYLE_SLOT_PREFIX } from "@wdprlib/ast";
import { mapElementChildren, walkElements } from "../walk";
import type { IfTagsData } from "../iftags/resolve";

type IfTagsDataWithStyleSlot = IfTagsData & {
  _styleSlot?: number;
};

export type ResolvedStyleSlots = ReadonlyMap<number, readonly string[]>;

export interface StyleCollectionResult {
  elements: Element[];
  styles: string[];
  anchoredStyles: string[];
  anchors: Element[];
}

/**
 * Collect and remove style elements from the AST.
 *
 * Unresolved `if-tags` elements receive style-slot placeholders so render-time
 * iftags evaluation can preserve style order relative to already collected CSS.
 */
export function collectStyles(
  elements: Element[],
  ignoredAnchors: WeakSet<Element> = new WeakSet(),
): StyleCollectionResult {
  const styles: string[] = [];
  const anchoredStyles: string[] = [];
  const anchors: Element[] = [];
  const usedSlots = collectExistingStyleSlots(elements);
  const ctx = { nextSlotId: 0, usedSlots };
  const filtered = collectStylesFromElements(
    elements,
    styles,
    anchoredStyles,
    anchors,
    ignoredAnchors,
    ctx,
  );
  return { elements: filtered, styles, anchoredStyles, anchors };
}

/**
 * Preserve styles collected by earlier resolution passes while keeping
 * unresolved IfTags style-slot markers idempotent across repeated passes.
 */
export function mergeCollectedStyles(
  existing: readonly string[] | undefined,
  collected: readonly string[],
  resolvedSlots: ResolvedStyleSlots = new Map(),
  anchoredStyles: readonly string[] = [],
): string[] {
  const unanchoredPrevious = [...(existing ?? [])];
  for (const style of anchoredStyles) removeFirst(unanchoredPrevious, style);
  for (const style of collected) {
    if (isStyleSlotMarker(style)) removeFirst(unanchoredPrevious, style);
  }

  const merged = unanchoredPrevious.filter((style) => !isStyleSlotMarker(style));
  for (const style of collected) {
    if (isStyleSlotMarker(style)) appendStyleSlot(merged, style, resolvedSlots);
    else merged.push(style);
  }
  return merged;
}

function isStyleSlotMarker(style: string): boolean {
  return style.startsWith(STYLE_SLOT_PREFIX);
}

export function createStyleSlotMarker(slotId: number): string {
  return `${STYLE_SLOT_PREFIX}${slotId}`;
}

export function getStyleSlotId(data: IfTagsData): number | undefined {
  const slotId = (data as IfTagsDataWithStyleSlot)._styleSlot;
  return Number.isSafeInteger(slotId) && slotId! >= 0 ? slotId : undefined;
}

function removeFirst(values: string[], value: string): void {
  const index = values.indexOf(value);
  if (index >= 0) values.splice(index, 1);
}

function appendStyleSlot(
  target: string[],
  marker: string,
  resolvedSlots: ResolvedStyleSlots,
): void {
  const slotId = Number(marker.slice(STYLE_SLOT_PREFIX.length));
  const replacement = resolvedSlots.get(slotId);
  if (replacement) target.push(...replacement);
  else target.push(marker);
}

function collectExistingStyleSlots(elements: Element[]): Set<number> {
  const slots = new Set<number>();
  walkElements(elements, (element) => {
    if (element.element !== "if-tags") return;
    const slotId = getStyleSlotId(element.data);
    if (slotId !== undefined) slots.add(slotId);
  });
  return slots;
}

function allocateStyleSlot(ctx: StyleCollectionContext): number {
  while (ctx.usedSlots.has(ctx.nextSlotId)) ctx.nextSlotId++;
  const slotId = ctx.nextSlotId++;
  ctx.usedSlots.add(slotId);
  return slotId;
}

interface StyleCollectionContext {
  nextSlotId: number;
  usedSlots: Set<number>;
}

function collectStylesFromElements(
  elements: Element[],
  styles: string[],
  anchoredStyles: string[],
  anchors: Element[],
  ignoredAnchors: WeakSet<Element>,
  ctx: StyleCollectionContext,
): Element[] {
  const result: Element[] = [];

  for (const element of elements) {
    if (element.element === "style") {
      const css = element.data as string;
      if (css.startsWith(STYLE_SLOT_PREFIX)) {
        styles.push(css);
        continue;
      }
      if (css.startsWith(STYLE_ANCHOR_PREFIX)) {
        anchors.push(element);
        if (ignoredAnchors.has(element)) {
          result.push(element);
          continue;
        }
        const anchoredCss = css.slice(STYLE_ANCHOR_PREFIX.length);
        styles.push(anchoredCss);
        anchoredStyles.push(anchoredCss);
        result.push(element);
        continue;
      }
      styles.push(css);
      const anchor: Element = { element: "style", data: `${STYLE_ANCHOR_PREFIX}${css}` };
      anchors.push(anchor);
      result.push(anchor);
      continue;
    }

    if (element.element === "if-tags") {
      const slotId = getStyleSlotId(element.data) ?? allocateStyleSlot(ctx);
      styles.push(createStyleSlotMarker(slotId));
      const data: IfTagsDataWithStyleSlot = { ...(element.data as IfTagsData), _styleSlot: slotId };
      result.push({
        element: "if-tags",
        data,
      });
      continue;
    }

    result.push(
      mapElementChildren(element, (children) =>
        collectStylesFromElements(children, styles, anchoredStyles, anchors, ignoredAnchors, ctx),
      ),
    );
  }

  return result;
}
