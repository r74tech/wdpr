/**
 *
 * Barrel exports for the TagCloud module.
 *
 * @module
 */

export { tagCloudModuleRule } from "./parser";
export { isTagCloudModule, resolveTagCloud, type TagCloudModuleData } from "./resolve";
export type {
  TagCloudDataFetcher,
  TagCloudDataRequirement,
  TagCloudExternalData,
  TagCloudTagData,
} from "./types";
