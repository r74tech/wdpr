import type { Element } from "@wdprlib/ast";

export type PreservedLineBreak = Extract<Element, { element: "line-break" }> & {
  _preservedTrailingBreak?: boolean;
};

export function createPreservedLineBreak(): PreservedLineBreak {
  return { element: "line-break", _preservedTrailingBreak: true };
}
