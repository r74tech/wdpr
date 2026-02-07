/**
 *
 * Parser rule for the Wikidot `[[module Backlinks]]` block.
 *
 * Displays pages that link to the current page (or a specified page).
 * Accepts an optional `page` attribute to target a specific page.
 *
 * @module
 */

import type { ModuleRule } from "../types";
import type { BacklinksModuleData } from "./types";

/**
 * Module rule for `[[module Backlinks]]`.
 *
 * Parses the optional `page` attribute. When not specified, the rendering
 * application should show backlinks for the current page.
 */
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
