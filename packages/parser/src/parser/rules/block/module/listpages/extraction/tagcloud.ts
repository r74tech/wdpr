import type { Module } from "@wdprlib/ast";
import { isTagCloudModule } from "../../tagcloud/resolve";
import type { ExtractionResult } from "./result";

export type TagCloudModuleForExtraction = Extract<Module, { module: "tag-cloud" }>;

export interface TagCloudExtractionState {
  nextId: number;
}

export { isTagCloudModule };

export function extractTagCloudModule(
  tagCloud: TagCloudModuleForExtraction,
  state: TagCloudExtractionState,
  result: ExtractionResult,
): void {
  const id = state.nextId++;

  result.requirements.tagCloud.push({
    id,
    category: tagCloud.category,
    limit: tagCloud.limit,
  });
}
