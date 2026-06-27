import type { Element } from "@wdprlib/ast";

export function textElement(data: string): Element {
  return { element: "text", data };
}
