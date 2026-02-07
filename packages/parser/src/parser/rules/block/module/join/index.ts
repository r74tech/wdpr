/**
 * @module join
 *
 * Parser rule for the Wikidot `[[module Join]]` block.
 *
 * Renders a "Join this site" button. Accepts an optional `button` attribute
 * to customize the button text.
 */

import type { ModuleRule } from "../types";
import type { JoinModuleData } from "./types";

/**
 * Module rule for `[[module Join]]`.
 *
 * Extracts the `button` attribute as the custom button text. All other
 * attributes are passed through in the `attributes` record for the
 * rendering application to handle.
 */
export const joinModuleRule: ModuleRule = {
  name: "module-join",
  acceptsNames: ["join"],
  hasBody: false,

  parse(_ctx, _pos, args): JoinModuleData {
    const { button, ...rest } = args;
    return {
      module: "join",
      "button-text": button ?? null,
      attributes: rest,
    };
  },
};
