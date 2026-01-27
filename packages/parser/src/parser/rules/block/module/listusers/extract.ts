/**
 * Extract data requirements for ListUsers modules
 */

import type { ListUsersVariable } from "./types";
import { compileListUsersTemplate } from "./compiler";

const VARIABLE_REGEX = /%%([a-z_]+)%%/gi;

const KNOWN_VARIABLES: ListUsersVariable[] = ["number", "title", "name"];

/**
 * Extract needed variables from a template string
 */
export function extractListUsersVariables(template: string): ListUsersVariable[] {
  const variables = new Set<ListUsersVariable>();

  for (const match of template.matchAll(VARIABLE_REGEX)) {
    const [, varName] = match;
    if (!varName) continue;
    const normalized = varName.toLowerCase();
    if (KNOWN_VARIABLES.includes(normalized as ListUsersVariable)) {
      variables.add(normalized as ListUsersVariable);
    }
  }

  return Array.from(variables);
}

export { compileListUsersTemplate };
