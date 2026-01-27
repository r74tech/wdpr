import type { ModuleRule } from "../types";
import type { BacklinksModuleData } from "./types";

export const backlinksModuleRule: ModuleRule = {
  name: "module-backlinks",
  acceptsNames: ["backlinks"],
  hasBody: false,

  parse(_ctx, _pos, args): BacklinksModuleData {
    return {
      module: "backlinks",
      page: args.page ?? null,
    };
  },
};
