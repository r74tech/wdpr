/**
 *
 * ListUsers module for Wikidot's `[[module ListUsers users="."]]` block.
 *
 * Displays information about site members using a template with
 * `%%number%%`, `%%title%%`, and `%%name%%` variables. Currently only
 * `users="."` (the logged-in user) is supported.
 *
 * Follows the same three-phase lifecycle as ListPages: parse, extract, resolve.
 *
 * @module
 */

// Parser
export { listUsersModuleRule } from "./parser";

// Types
export type {
  ListUsersVariable,
  ListUsersUserData,
  ListUsersDataRequirement,
  ListUsersExternalData,
  ListUsersDataFetcher,
  ListUsersVariableContext,
  ListUsersCompiledTemplate,
} from "./types";

// Extraction
export { extractListUsersVariables } from "./extract";

// Compiler
export { compileListUsersTemplate } from "./compiler";

// Resolution
export type { ListUsersModuleData } from "./resolve";
export { isListUsersModule, resolveListUsers } from "./resolve";
