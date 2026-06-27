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
import { createListUsersVariableGetter } from "./getters";
import { LIST_USERS_VARIABLE_REGEX } from "./variables";

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

  for (const match of template.matchAll(LIST_USERS_VARIABLE_REGEX)) {
    if (match.index !== undefined && match.index > lastIndex) {
      parts.push(template.slice(lastIndex, match.index));
    }

    const [, varName] = match;
    if (!varName) continue;
    const getter = createListUsersVariableGetter(varName.toLowerCase());
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
