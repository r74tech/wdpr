/**
 *
 * Data requirement extraction for the ListUsers module.
 *
 * Analyzes a ListUsers template string to determine which variables
 * (`%%number%%`, `%%title%%`, `%%name%%`) are referenced. This tells the
 * external application which user data fields need to be provided.
 *
 * @module
 */

import type { ListUsersVariable } from "./types";
import { compileListUsersTemplate } from "./compiler";

/** Regex for matching `%%variable%%` patterns in ListUsers templates. */
const VARIABLE_REGEX = /%%([a-z_]+)%%/gi;

/** The complete list of recognized ListUsers template variables. */
const KNOWN_VARIABLES: ListUsersVariable[] = ["number", "title", "name"];

/**
 * Extract the set of template variables referenced in a ListUsers template string.
 *
 * Scans for `%%variable%%` patterns and returns only those that match known
 * ListUsers variables. Unknown variables are silently ignored.
 *
 * @param template - The template string from the module body
 * @returns Deduplicated array of referenced variable names
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
