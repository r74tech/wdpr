import type { ContainerData, Element, ExprData } from "@wdprlib/ast";

export type InternalContainerData = ContainerData & {
  _paragraphStrip?: boolean;
  _emptyParagraphStrip?: boolean;
  _escapedFromParagraph?: boolean;
  _splitByBlankLine?: boolean;
};

export function isContainer(el: Element, type: string): boolean {
  if (el.element !== "container") return false;
  return el.data.type === type;
}

export function getContainerData(el: Element): ContainerData | null {
  if (el.element !== "container") return null;
  return el.data;
}

export function isSpanStripMarker(el: Element | undefined): boolean {
  if (!el || el.element !== "container") return false;
  const data = el.data as InternalContainerData;
  return (
    data.type === "span" && (data._paragraphStrip === true || data._emptyParagraphStrip === true)
  );
}

export function hasParagraphStripSpan(para: Element): boolean {
  const data = getContainerData(para);
  if (!data || data.type !== "paragraph") return false;
  return data.elements.some((child) => isSpanStripMarker(child));
}

export function isEscapedSpan(el: Element): boolean {
  if (el.element !== "container") return false;
  const data = el.data as InternalContainerData;
  return data.type === "span" && data._escapedFromParagraph === true;
}

export function isSplitSpan(el: Element): boolean {
  if (el.element !== "container") return false;
  const data = el.data as InternalContainerData;
  return data.type === "span" && data._splitByBlankLine === true;
}

export function isEmptyExpr(el: Element): boolean {
  if (el.element !== "expr") return false;
  const data = el.data as ExprData;
  return data.expression === "";
}

export function isEmptySpan(el: Element): boolean {
  if (el.element !== "container") return false;
  return el.data.type === "span" && el.data.elements.length === 0;
}

export function isWhitespaceText(el: Element): boolean {
  return el.element === "text" && typeof el.data === "string" && /^\s+$/.test(el.data);
}
