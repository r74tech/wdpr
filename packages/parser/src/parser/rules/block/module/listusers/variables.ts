import type { ListUsersVariable } from "./types";

/** Regex for matching `%%variable%%` patterns in ListUsers templates. */
export const LIST_USERS_VARIABLE_REGEX: RegExp = /%%([a-z_]+)%%/gi;

/** The complete set of recognized ListUsers template variables. */
const KNOWN_VARIABLES: ReadonlySet<string> = new Set<ListUsersVariable>([
  "number",
  "title",
  "name",
]);

export function isListUsersVariable(name: string): name is ListUsersVariable {
  return KNOWN_VARIABLES.has(name);
}
