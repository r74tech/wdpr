import type { Element } from "@wdprlib/ast";
import type { RuleResult } from "../../types";

export function rawElement(value: string, consumed: number): RuleResult<Element> {
  return {
    success: true,
    elements: [{ element: "raw", data: value }],
    consumed,
  };
}

export function textElement(value: string, consumed: number): RuleResult<Element> {
  return {
    success: true,
    elements: [{ element: "text", data: value }],
    consumed,
  };
}

export function emptyRaw(consumed: number): RuleResult<Element> {
  return {
    success: true,
    elements: [],
    consumed,
  };
}
