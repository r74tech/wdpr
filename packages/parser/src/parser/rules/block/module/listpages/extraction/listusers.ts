import type { Module } from "@wdprlib/ast";
import { compileListUsersTemplate, extractListUsersVariables } from "../../listusers/extract";
import type { ExtractionResult } from "./result";

export type ListUsersModuleForExtraction = Extract<Module, { module: "list-users" }>;

export interface ListUsersExtractionState {
  nextId: number;
}

export function isListUsersModule(module: Module): module is ListUsersModuleForExtraction {
  return module.module === "list-users";
}

export function extractListUsersModule(
  listUsers: ListUsersModuleForExtraction,
  state: ListUsersExtractionState,
  result: ExtractionResult,
): void {
  const id = state.nextId++;
  const body = listUsers.body ?? "";

  result.requirements.listUsers.push({
    id,
    users: listUsers.users,
    neededVariables: extractListUsersVariables(body),
  });

  result.compiledListUsersTemplates.set(id, compileListUsersTemplate(body));
}
