import type { ListPagesVariable } from "../types";
import { createTemplateVariableRegex } from "../template/syntax";
import { normalizeVariableName } from "./variables";

/**
 * Default template used when a ListPages module has no body specified.
 */
export const DEFAULT_BODY_TEMPLATE = `+ %%title_linked%%

by %%created_by_linked%% %%created_at%%

%%summary%%`;

/**
 * Internal result of analyzing a ListPages template string for variable usage.
 */
export interface TemplateExtraction {
  variables: ListPagesVariable[];
  contentIndices: number[];
  previewLengths: number[];
  formFields: string[];
  tagsLinkPrefix?: string;
  hiddenTagsLinkPrefix?: string;
}

/**
 * Extract all variable references from a ListPages template string.
 */
export function extractVariablesFromTemplate(template: string): TemplateExtraction {
  const variables = new Set<ListPagesVariable>();
  const contentIndices = new Set<number>();
  const previewLengths = new Set<number>();
  const formFields = new Set<string>();
  let tagsLinkPrefix: string | undefined;
  let hiddenTagsLinkPrefix: string | undefined;

  for (const match of template.matchAll(createTemplateVariableRegex())) {
    const [, name, braceParam, parenParam, format] = match;
    if (!name) continue;
    const varName = name.toLowerCase();

    if (braceParam !== undefined) {
      switch (varName) {
        case "content":
          contentIndices.add(Number(braceParam));
          variables.add("content_n");
          continue;
        case "form_data":
          formFields.add(braceParam);
          variables.add("form_data");
          continue;
        case "form_raw":
          formFields.add(braceParam);
          variables.add("form_raw");
          continue;
        case "form_label":
          formFields.add(braceParam);
          variables.add("form_label");
          continue;
        case "form_hint":
          formFields.add(braceParam);
          variables.add("form_hint");
          continue;
      }
    }

    if (parenParam !== undefined && varName === "preview") {
      previewLengths.add(Number(parenParam));
      variables.add("preview_n");
      continue;
    }

    if (varName === "tags_linked") {
      if (format) tagsLinkPrefix = format;
      variables.add("tags_linked");
      continue;
    }
    if (varName === "_tags_linked") {
      if (format) hiddenTagsLinkPrefix = format;
      variables.add("_tags_linked");
      continue;
    }

    const normalized = normalizeVariableName(varName);
    if (normalized) {
      variables.add(normalized);
    }
  }

  return {
    variables: Array.from(variables),
    contentIndices: Array.from(contentIndices).sort((a, b) => a - b),
    previewLengths: Array.from(previewLengths).sort((a, b) => a - b),
    formFields: Array.from(formFields).sort(),
    tagsLinkPrefix,
    hiddenTagsLinkPrefix,
  };
}
