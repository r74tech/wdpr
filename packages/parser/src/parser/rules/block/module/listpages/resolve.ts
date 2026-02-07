/**
 * @module listpages/resolve
 *
 * ListPages module resolution (phase 3 of the ListPages lifecycle).
 *
 * After the application has fetched page data based on the extracted requirements,
 * this module substitutes that data into the pre-compiled templates and re-parses
 * the resulting wikitext to produce final AST elements.
 *
 * For each page in the fetched data:
 * 1. Build a `VariableContext` with page data, index, total count, and site info
 * 2. Execute the compiled template to produce a wikitext string
 * 3. Re-parse the wikitext string into AST elements
 * 4. Optionally wrap each item in a `div.list-pages-item` (when `separate=true`)
 *
 * The final result may also include prepend/append lines and be wrapped in a
 * `div.list-pages-box` (when `wrapper=true`).
 */

import type { Element, Module } from "@wdprlib/ast";
import type { ListPagesExternalData, CompiledTemplate, VariableContext } from "./types";
import type { ParseFunction } from "../types";
export type { ParseFunction };

/**
 * Narrowed type for the list-pages variant of the Module discriminated union.
 */
export type ListPagesModuleData = Extract<Module, { module: "list-pages" }>;

/**
 * Type guard to check if a Module is a list-pages module.
 *
 * @param module - A Module discriminated union value
 * @returns true if the module is a list-pages module
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
