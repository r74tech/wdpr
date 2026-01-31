/**
 * ListPages module resolution
 *
 * Handles expanding ListPages modules with fetched data.
 */

import type { Element, Module } from "@wdprlib/ast";
import type { ListPagesExternalData, CompiledTemplate, VariableContext } from "./types";
import type { ParseFunction } from "../types";
export type { ParseFunction };

/**
 * ListPages module data type
 */
export type ListPagesModuleData = Extract<Module, { module: "list-pages" }>;

/**
 * Type guard for list-pages module
 */
export function isListPagesModule(module: Module): module is ListPagesModuleData {
  return module.module === "list-pages";
}

/**
 * Resolve a single ListPages module
 *
 * @param module - ListPages module data from AST
 * @param data - External data fetched for this module
 * @param compiledTemplate - Pre-compiled template function
 * @param parse - Parser function for re-parsing templates
 * @returns Resolved elements
 */
export function resolveListPages(
  module: ListPagesModuleData,
  data: ListPagesExternalData,
  compiledTemplate: CompiledTemplate,
  parse: ParseFunction,
): Element[] {
  const items: Element[] = [];

  // Process each page
  for (let i = 0; i < data.pages.length; i++) {
    const page = data.pages[i];
    if (!page) continue;

    const ctx: VariableContext = {
      page,
      index: i + 1,
      total: data.totalCount,
      limit: module.limit,
      site: data.site,
    };

    // Execute compiled template
    const substituted = compiledTemplate(ctx);

    // Re-parse as wikitext
    const itemAst = parse(substituted);

    if (module.separate) {
      // Wrap each item in div
      const wrapper: Element = {
        element: "container",
        data: {
          type: "div",
          attributes: { class: "list-pages-item" },
          elements: itemAst.elements,
        },
      };
      items.push(wrapper);
    } else {
      items.push(...itemAst.elements);
    }
  }

  // Handle empty results
  if (items.length === 0) {
    return [];
  }

  // Build final result
  const result: Element[] = [];

  // Prepend line (only when separate=false)
  if (module["prepend-line"] && !module.separate) {
    const prependAst = parse(module["prepend-line"]);
    result.push(...prependAst.elements);
  }

  result.push(...items);

  // Append line (only when separate=false)
  if (module["append-line"] && !module.separate) {
    const appendAst = parse(module["append-line"]);
    result.push(...appendAst.elements);
  }

  // Wrap everything if wrapper=true
  if (module.wrapper) {
    return [
      {
        element: "container",
        data: {
          type: "div",
          attributes: { class: "list-pages-box" },
          elements: result,
        },
      },
    ];
  }

  return result;
}
