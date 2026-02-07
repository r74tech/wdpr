/**
 * @module categories
 *
 * Parser rule for the Wikidot `[[module Categories]]` block.
 *
 * Displays a list of page categories on the site. Accepts an optional
 * `include-hidden` boolean attribute to control whether hidden categories
 * (those prefixed with `_`) are shown.
 */

import type { ModuleRule } from "../types";
import { parseBool } from "../utils";
import type { CategoriesModuleData } from "./types";

/**
 * Module rule for `[[module Categories]]`.
 *
 * Parses the `include-hidden` attribute (accepts both `include-hidden` and
 * `includehidden` forms, since Wikidot lowercases all attribute names).
 * Defaults to false.
 */
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
