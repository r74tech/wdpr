/**
 * Shared block parser utility facade.
 *
 * Implementation lives in ./parsing/* so dispatch, content parsing,
 * attributes, and close-condition handling can evolve independently.
 *
 * @module
 */
export { filterUnsafeAttributes, parseBlockName } from "../common";
export { canApplyBlockRule, getCandidateBlockRules } from "./parsing/rule-dispatch";
export type { BlockParseResult } from "./parsing/content";
export { parseBlocksUntil } from "./parsing/content";
export { parseInlineContentUntil } from "./parsing/inline-content";
export { parseAttributes, parseAttributesRaw } from "./parsing/attributes";
export { createBlockEndCondition } from "./parsing/end-condition";
