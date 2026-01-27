import type { ModuleRule } from "../types";
import { parseInt32 } from "../utils";
import type { PageTreeModuleData } from "./types";

export const pageTreeModuleRule: ModuleRule = {
  name: "module-page-tree",
  acceptsNames: ["pagetree"],
  hasBody: false,

  parse(_ctx, _pos, args): PageTreeModuleData {
    // Note: Wikidot only accepts "true" for showRoot, not "yes"
    const showRootValue = args["show-root"] ?? args.showroot;
    return {
      module: "page-tree",
      root: args.root ?? null,
      "show-root": showRootValue === "true",
      depth: parseInt32(args.depth) ?? null,
    };
  },
};
