import type { Element } from "@wdprlib/ast";

type PreservedLineBreak = Extract<Element, { element: "line-break" }> & {
  _preservedTrailingBreak?: boolean;
};

export function createPreservedTrailingLineBreak(): Element {
  const lineBreak: PreservedLineBreak = { element: "line-break" };
  lineBreak._preservedTrailingBreak = true;
  return lineBreak;
}
