import type { ModuleRule } from "../types";
import { parseBool } from "../utils";
import type { CategoriesModuleData } from "./types";

export const categoriesModuleRule: ModuleRule = {
  name: "module-categories",
  acceptsNames: ["categories"],
  hasBody: false,

  parse(_ctx, _pos, args): CategoriesModuleData {
    return {
      module: "categories",
      "include-hidden": parseBool(args["include-hidden"] ?? args.includehidden, false),
    };
  },
};
