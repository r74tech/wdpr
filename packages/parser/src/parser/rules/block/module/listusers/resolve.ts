/**
 * @module listusers/resolve
 *
 * ListUsers module resolution.
 *
 * After the application has fetched user data based on the extracted requirements,
 * this module substitutes that data into the pre-compiled template and re-parses
 * the resulting wikitext to produce final AST elements.
 */

import type { Element, Module } from "@wdprlib/ast";
import type {
  ListUsersExternalData,
  ListUsersCompiledTemplate,
  ListUsersVariableContext,
} from "./types";
import type { ParseFunction } from "../types";

/**
 * Narrowed type for the list-users variant of the Module discriminated union.
 */
export type ListUsersModuleData = Extract<Module, { module: "list-users" }>;

/**
 * Type guard to check if a Module is a list-users module.
 *
 * @param module - A Module discriminated union value
 * @returns true if the module is a list-users module
 */
export function isListUsersModule(module: Module): module is ListUsersModuleData {
  return module.module === "list-users";
}

/**
 * Resolve a single ListUsers module by substituting fetched user data into
 * the pre-compiled template and re-parsing the result as wikitext.
 *
 * Currently ListUsers only renders the logged-in user (no iteration over
 * multiple users), so the template is executed exactly once.
 *
 * @param _module - The list-users module data from the AST (unused, reserved for future use)
 * @param data - External user data fetched by the application
 * @param compiledTemplate - Pre-compiled template function from the extraction phase
 * @param parse - Parser function for re-parsing the substituted template as wikitext
 * @returns Array of AST elements produced by parsing the rendered template
 */
export function resolveListUsers(
  _module: ListUsersModuleData,
  data: ListUsersExternalData,
  compiledTemplate: ListUsersCompiledTemplate,
  parse: ParseFunction,
): Element[] {
  const ctx: ListUsersVariableContext = { user: data.user };
  const substituted = compiledTemplate(ctx);
  const itemAst = parse(substituted);
  return itemAst.elements;
}
