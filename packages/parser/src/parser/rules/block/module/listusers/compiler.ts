/**
 * Template compiler for ListUsers module
 *
 * Compiles template strings like "%%title%% (%%name%%)"
 * into executable functions. Supports 3 variables: number, title, name.
 */

import type { ListUsersCompiledTemplate, ListUsersVariableContext } from "./types";

const VARIABLE_REGEX = /%%([a-z_]+)%%/gi;

/**
 * Compile a template string into an executable function
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
