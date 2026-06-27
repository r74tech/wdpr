import type { Module } from "@wdprlib/ast";
import type { ListPagesQuery } from "../types";
import { compileTemplate } from "../compiler";
import { buildQuery } from "./query";
import { DEFAULT_BODY_TEMPLATE, extractVariablesFromTemplate } from "./template";
import type { ExtractionResult } from "./result";

export type ListPagesModuleForExtraction = Extract<Module, { module: "list-pages" }>;

export interface ListPagesExtractionState {
  nextId: number;
}

export function isListPagesModule(module: Module): module is ListPagesModuleForExtraction {
  return module.module === "list-pages";
}

export function extractListPagesModule(
  listPages: ListPagesModuleForExtraction,
  state: ListPagesExtractionState,
  result: ExtractionResult,
): void {
  const id = state.nextId++;
  const body = listPages.body ?? DEFAULT_BODY_TEMPLATE;
  const extraction = extractVariablesFromTemplate(body);
  const query: ListPagesQuery = buildQuery(listPages);

  result.requirements.listPages.push({
    id,
    query,
    neededVariables: extraction.variables,
    contentSectionIndices: extraction.contentIndices,
    previewLengths: extraction.previewLengths,
    formFields: extraction.formFields,
    tagsLinkPrefix: extraction.tagsLinkPrefix,
    hiddenTagsLinkPrefix: extraction.hiddenTagsLinkPrefix,
    urlAttrPrefix: listPages["url-attr-prefix"],
    rawAttributes: listPages.attributes ?? {},
  });

  result.compiledListPagesTemplates.set(id, compileTemplate(body));
}
