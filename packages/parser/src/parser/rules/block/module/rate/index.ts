/**
 * @module rate
 *
 * Parser rule for the Wikidot `[[module Rate]]` block.
 *
 * Renders a page rating widget. This is a simple module with no attributes
 * and no body content.
 */

import type { ModuleRule } from "../types";
import type { RateModuleData } from "./types";

/**
 * Module rule for `[[module Rate]]`.
 *
 * Simply produces a `{ module: "rate" }` AST node. The rendering application
 * is responsible for displaying upvote/downvote buttons and the current rating.
 */
export const rateModuleRule: ModuleRule = {
  name: "module-rate",
  acceptsNames: ["rate"],
  hasBody: false,

  parse(): RateModuleData {
    return { module: "rate" };
  },
};
