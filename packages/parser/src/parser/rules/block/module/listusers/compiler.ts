/**
 *
 * Template compiler for the ListUsers module.
 *
 * Compiles ListUsers template strings (e.g., `"%%title%% (%%name%%)"`) into
 * executable functions for efficient rendering. The compilation approach is
 * identical to the ListPages compiler: the template is split into static
 * string segments and dynamic getter functions.
 *
 * Only three variables are supported: `%%number%%`, `%%title%%`, and `%%name%%`.
 *
 * @module
 */

import type { ListUsersCompiledTemplate, ListUsersVariableContext } from "./types";

/** Regex for matching `%%variable%%` patterns in the template. */
const VARIABLE_REGEX = /%%([a-z_]+)%%/gi;

/**
 * Compile a ListUsers template string into an executable function.
 *
 * The template is split into alternating static strings and dynamic getter
 * functions. The returned function concatenates these parts for each call.
 *
 * @param template - The template string containing `%%variable%%` placeholders
 * @returns A compiled function that accepts a `ListUsersVariableContext` and returns rendered text
 */
export function compileListUsersTemplate(template: string): ListUsersCompiledTemplate {
  const parts: (string | ((ctx: ListUsersVariableContext) => string))[] = [];
  let lastIndex = 0;

  for (const match of template.matchAll(VARIABLE_REGEX)) {
    if (match.index !== undefined && match.index > lastIndex) {
      parts.push(template.slice(lastIndex, match.index));
    }

    const [, varName] = match;
    if (!varName) continue;
    const getter = createVariableGetter(varName.toLowerCase());
    parts.push(getter);

    lastIndex = match.index !== undefined ? match.index + match[0].length : lastIndex;
  }

  if (lastIndex < template.length) {
    parts.push(template.slice(lastIndex));
  }

  return (ctx: ListUsersVariableContext): string => {
    let result = "";
    for (const part of parts) {
      result += typeof part === "string" ? part : part(ctx);
    }
    return result;
  };
}

/**
 * Create a getter function for a specific ListUsers variable.
 *
 * @param name - Lowercase variable name
 * @returns A function that extracts the variable's value from a ListUsersVariableContext.
 *          Unknown names return a function that always returns an empty string.
 */
function createVariableGetter(name: string): (ctx: ListUsersVariableContext) => string {
  switch (name) {
    case "number":
      return (ctx) => String(ctx.user.number);
    case "title":
      return (ctx) => ctx.user.title;
    case "name":
      return (ctx) => ctx.user.name;
    default:
      return () => "";
  }
}
