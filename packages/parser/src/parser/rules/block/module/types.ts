import type { Element, Module } from "@wdpr/ast";
import type { ParseContext } from "../../types";

/**
 * Parser function type for re-parsing substituted templates
 * Used by ListPages and ListUsers modules
 */
export type ParseFunction = (input: string) => { elements: Element[] };

/**
 * Module rule definition
 *
 * parse の戻り値:
 * - Module: { element: "module", data: Module } としてラップされる
 * - Element: そのまま Element として返される（CSS モジュール等）
 */
export interface ModuleRule {
  name: string;
  acceptsNames: string[];
  /** Whether this module accepts a body (content between [[module]] and [[/module]]) */
  hasBody: boolean;
  parse: (
    ctx: ParseContext,
    pos: number,
    args: Record<string, string>,
    body?: string,
  ) => Module | Element;
}
