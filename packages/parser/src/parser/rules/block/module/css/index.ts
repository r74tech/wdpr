/**
 *
 * Parser rule for the Wikidot `[[module CSS]]` block.
 *
 * Allows embedding custom CSS styles within a Wikidot page. The module body
 * contains raw CSS text that is emitted as a `style` element in the AST.
 *
 * @example
 * ```
 * [[module CSS]]
 * .custom-class { color: red; }
 * [[/module]]
 * ```
 *
 * @module
 */

import type { Element } from "@wdprlib/ast";
import type { ModuleRule } from "../types";

/**
 * Module rule for `[[module CSS]]`.
 *
 * Unlike most modules that produce a `Module` AST node, the CSS module
 * produces a direct `style` Element. This is because CSS content is not
 * a Wikidot module that needs external data resolution -- it can be
 * rendered immediately as a `<style>` tag.
 */
export const cssModuleRule: ModuleRule = {
  name: "module-css",
  acceptsNames: ["css"],
  hasBody: true,

  parse(_ctx, _pos, _args, body): Element {
    return { element: "style", data: body ?? "" };
  },
};
