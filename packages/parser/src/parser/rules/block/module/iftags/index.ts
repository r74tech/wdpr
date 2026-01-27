/**
 * IfTags module
 *
 * Exports types and resolution functionality.
 */

// Types
export type { TagCondition, IfTagsResolver } from "./types";

// Condition parsing and evaluation
export { parseTagCondition, evaluateTagCondition } from "./condition";

// Resolution
export type { IfTagsData, IfTagsResolveResult } from "./resolve";
export { isIfTagsElement, resolveIfTags } from "./resolve";
