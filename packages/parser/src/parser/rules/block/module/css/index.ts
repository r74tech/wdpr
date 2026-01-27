import type { Element } from "@wdpr/ast";
import type { ModuleRule } from "../types";

export const cssModuleRule: ModuleRule = {
  name: "module-css",
  acceptsNames: ["css"],
  hasBody: true,

  parse(_ctx, _pos, _args, body): Element {
    return { element: "style", data: body ?? "" };
  },
};
