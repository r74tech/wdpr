import type { Element } from "@wdprlib/ast";

type PreservedLineBreak = Extract<Element, { element: "line-break" }> & {
  _preservedTrailingBreak?: boolean;
  _preservedLeadingBreak?: boolean;
};

export function createPreservedTrailingLineBreak(): Element {
  const lineBreak: PreservedLineBreak = { element: "line-break" };
  lineBreak._preservedTrailingBreak = true;
  return lineBreak;
}

export function createPreservedLeadingLineBreak(): Element {
  const lineBreak: PreservedLineBreak = { element: "line-break", _preservedLeadingBreak: true };
  return lineBreak;
}

export function isPreservedLeadingLineBreak(element: Element | undefined): boolean {
  return (
    element?.element === "line-break" &&
    (element as PreservedLineBreak)._preservedLeadingBreak === true
  );
}
