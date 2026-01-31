/**
 * ListUsers module parser
 */

import type { Element, Module } from "@wdprlib/ast";
import type { ModuleRule } from "../types";

const ERROR_MESSAGE = 'Currently only users="." is implemented.';

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
