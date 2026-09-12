import type { RatingRef, RatingState } from "@wdprlib/ast";
export type { RateModuleData, CustomRateModuleData } from "@wdprlib/ast";

/**
 * Read authorized ratings for the displayed page. Omit unknown, disabled, or
 * inaccessible references. The host owns registration, category policies,
 * access checks, aggregates, and persistence; rendering must never create data.
 */
export type RatingsFetcher = (refs: readonly RatingRef[]) => Promise<readonly RatingState[]>;
