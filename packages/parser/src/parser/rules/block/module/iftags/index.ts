/**
 *
 * IfTags conditional rendering module for Wikidot's `[[iftags]]` block.
 *
 * Enables conditional content display based on the current page's tags.
 * The condition syntax supports required tags (`+tag` or bare `tag`) and
 * forbidden tags (`-tag`). Content inside the block is only rendered when
 * all conditions are satisfied.
 *
 * Exports condition parsing, evaluation, and AST resolution functions.
 *
 * @module
 */

// Types
export type { TagCondition, IfTagsResolver } from "./types";

// Condition parsing and evaluation
export { parseTagCondition, evaluateTagCondition } from "./condition";

// Resolution
export type { IfTagsData, IfTagsResolveResult } from "./resolve";
export { isIfTagsElement, resolveIfTags } from "./resolve";

// Source-level preprocessing (must run after include expansion, before parse)
export { preprocessIftags } from "./preprocess";
