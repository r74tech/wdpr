/**
 * @module page-tree
 *
 * Parser rule for the Wikidot `[[module PageTree]]` block.
 *
 * Renders a hierarchical tree of pages based on parent-child relationships.
 * Accepts optional `root`, `show-root`, and `depth` attributes.
 */

import type { ModuleRule } from "../types";
import { parseInt32 } from "../utils";
import type { PageTreeModuleData } from "./types";

/**
 * Module rule for `[[module PageTree]]`.
 *
 * Parses `root`, `show-root`, and `depth` attributes. The `show-root`
 * attribute intentionally uses strict comparison with `"true"` (not
 * `parseBool`) because Wikidot only accepts `"true"` for this attribute,
 * not `"yes"`.
 */
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
