/**
 * @module module/mapping
 *
 * Module rule registry and name-based lookup.
 *
 * This module maintains the complete list of supported Wikidot module rules
 * and provides a case-insensitive lookup by module name. When the parser
 * encounters `[[module XYZ ...]]`, it uses `getModuleRuleByName("xyz")` to
 * find the corresponding rule handler.
 */

import type { ModuleRule } from "./types";
import { rateModuleRule } from "./rate/index";
import { cssModuleRule } from "./css/index";
import { backlinksModuleRule } from "./backlinks/index";
import { categoriesModuleRule } from "./categories/index";
import { joinModuleRule } from "./join/index";
import { pageTreeModuleRule } from "./page-tree/index";
import { listPagesModuleRule } from "./listpages/parser";
import { listUsersModuleRule } from "./listusers/parser";

/**
 * Complete list of all registered module rules.
 *
 * Each rule handles one or more Wikidot module names. The order does not
 * affect lookup behavior since the lookup map is built from `acceptsNames`.
 */
export const MODULE_RULES: ModuleRule[] = [
  rateModuleRule,
  cssModuleRule,
  backlinksModuleRule,
  categoriesModuleRule,
  joinModuleRule,
  pageTreeModuleRule,
  listPagesModuleRule,
  listUsersModuleRule,
];

/**
 * Internal lookup map from lowercase module name to its rule handler.
 * Built once at module load time from the `acceptsNames` arrays.
 */
const moduleRuleMap: Map<string, ModuleRule> = new Map();

// Build the map
for (const rule of MODULE_RULES) {
  for (const name of rule.acceptsNames) {
    moduleRuleMap.set(name.toLowerCase(), rule);
  }
}

/**
 * Look up a module rule by its Wikidot module name (case-insensitive).
 *
 * @param name - The module name from `[[module Name ...]]` syntax
 * @returns The matching module rule, or undefined if no rule handles this name
 */
export function getModuleRuleByName(name: string): ModuleRule | undefined {
  return moduleRuleMap.get(name.toLowerCase());
}
