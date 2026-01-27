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
 * All module rules
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
 * Module rule map for name lookup
 */
const moduleRuleMap: Map<string, ModuleRule> = new Map();

// Build the map
for (const rule of MODULE_RULES) {
  for (const name of rule.acceptsNames) {
    moduleRuleMap.set(name.toLowerCase(), rule);
  }
}

/**
 * Get module rule by name (case-insensitive)
 */
export function getModuleRuleByName(name: string): ModuleRule | undefined {
  return moduleRuleMap.get(name.toLowerCase());
}
