import type { Element } from "@wdprlib/ast";
import type { RuleResult } from "../../types";

export function literalOpenLink(value: string): RuleResult<Element> {
  return {
    success: true,
    elements: [{ element: "text", data: value }],
    consumed: 1,
  };
}
