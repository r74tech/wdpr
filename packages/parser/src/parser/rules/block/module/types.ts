/**
 *
 * Core type definitions for the Wikidot module system.
 *
 * Wikidot modules are block-level constructs invoked with `[[module Name ...]]`
 * syntax. Each module type (ListPages, CSS, Rate, etc.) is implemented as a
 * `ModuleRule` that defines how to parse the module's attributes and body into
 * an AST node.
 *
 * @module
 */

import type { Element, Module } from "@wdprlib/ast";
import type { ParseContext } from "../../types";

/**
 * Parser function type for re-parsing substituted template output as wikitext.
 *
 * Used by ListPages and ListUsers modules during the resolution phase. After
 * template variables are substituted with actual data, the resulting string
 * needs to be parsed as wikitext to produce AST elements.
 *
 * @param input - Wikitext string to parse
 * @returns Object containing the parsed elements
 */
export type ParseFunction = (input: string) => { elements: Element[] };

/**
 * Definition of a module rule that handles a specific Wikidot module type.
 *
 * Each module rule declares which module names it handles (e.g., "listpages",
 * "css"), whether the module accepts a body (content between `[[module Name]]`
 * and `[[/module]]`), and a parse function that produces the AST representation.
 *
 * The parse function's return type determines how the result is handled:
 * - `Module`: Wrapped as `{ element: "module", data: Module }` in the AST
 * - `Element`: Used directly as an AST element (e.g., CSS module returns a `style` element)
 */
export interface ModuleRule {
  /** Internal identifier for the rule (e.g., "module-listpages") */
  name: string;
  /** Module names this rule handles, matched case-insensitively (e.g., ["listpages"]) */
  acceptsNames: string[];
  /** Whether this module accepts a body (content between `[[module]]` and `[[/module]]`) */
  hasBody: boolean;
  /**
   * Parse the module's attributes and optional body into an AST node.
   *
   * @param ctx - Current parse context (token stream, settings, etc.)
   * @param pos - Current token position
   * @param args - Key-value attributes from the module's opening tag
   * @param body - Raw text content between opening and closing tags (only if `hasBody` is true)
   * @returns A Module data object or a direct Element
   */
  parse: (
    ctx: ParseContext,
    pos: number,
    args: Record<string, string>,
    body?: string,
  ) => Module | Element;
}
