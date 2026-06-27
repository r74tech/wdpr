/**
 *
 * Shared helper facade for source-level preprocess passes.
 *
 * Raw-region masking and bracket-depth tracking are implemented in separate
 * files so preprocess passes can depend on a small stable import surface.
 *
 * @module
 */

export type { Sentinels } from "./raw-regions";
export { makeUniqueSentinels, maskRawRegions, restorePlaceholders } from "./raw-regions";
export { computeBracketDepths } from "./bracket-depths";
