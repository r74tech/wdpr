/**
 * ListUsers module resolution
 */

import type { Element, Module } from "@wdprlib/ast";
import type {
  ListUsersExternalData,
  ListUsersCompiledTemplate,
  ListUsersVariableContext,
} from "./types";
import type { ParseFunction } from "../types";

/**
 * ListUsers module data type
 */
export type ListUsersModuleData = Extract<Module, { module: "list-users" }>;

/**
 * Type guard for list-users module
 */
export function isListUsersModule(module: Module): module is ListUsersModuleData {
  return module.module === "list-users";
}

/**
 * Resolve a single ListUsers module
 * Note: ListUsers returns only the logged-in user
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
