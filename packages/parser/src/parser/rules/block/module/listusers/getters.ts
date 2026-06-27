import type { ListUsersVariableContext } from "./types";

type ListUsersVariableGetter = (ctx: ListUsersVariableContext) => string;

/**
 * Create a getter function for a specific ListUsers variable.
 *
 * Unknown names return a function that always returns an empty string.
 */
export function createListUsersVariableGetter(name: string): ListUsersVariableGetter {
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
