/**
 * @module listusers/parser
 *
 * Parser rule for the Wikidot `[[module ListUsers ...]]` block.
 *
 * Parses the module's attributes into a `list-users` Module AST node.
 * Currently only `users="."` (logged-in user) is supported; other values
 * produce an error block element.
 */

import type { Element, Module } from "@wdprlib/ast";
import type { ModuleRule } from "../types";

/** Error message displayed when an unsupported `users` value is provided. */
const ERROR_MESSAGE = 'Currently only users="." is implemented.';

/**
 * Module rule for `[[module ListUsers ...]]`.
 *
 * ListUsers displays information about site members. The `users` attribute
 * controls which users are listed. Currently only `"."` (the logged-in user)
 * is implemented. Any other value produces an error block.
 *
 * The template body uses `%%number%%`, `%%title%%`, and `%%name%%` variables.
 */
export const listUsersModuleRule: ModuleRule = {
  name: "module-listusers",
  acceptsNames: ["listusers"],
  hasBody: true,

  parse(_ctx, _pos, args, body): Module | Element {
    const { users, ...rest } = args;
    const usersValue = users ?? ".";

    if (usersValue !== ".") {
      return {
        element: "container",
        data: {
          type: "div",
          attributes: { class: "error-block" },
          elements: [{ element: "text", data: ERROR_MESSAGE }],
        },
      };
    }

    return {
      module: "list-users",
      users: usersValue,
      body,
      attributes: rest,
    };
  },
};
