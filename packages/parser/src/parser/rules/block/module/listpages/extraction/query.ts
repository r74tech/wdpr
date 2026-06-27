import type { Module } from "@wdprlib/ast";
import type { ListPagesQuery } from "../types";

type ListPagesModuleData = Extract<Module, { module: "list-pages" }>;

/**
 * Build a ListPagesQuery from the parsed module attributes.
 *
 * Maps module attribute names, which use kebab-case in the AST, to the query's
 * camelCase property names. Data form fields prefixed with `_` are grouped under
 * `dataFormFields`.
 */
export function buildQuery(module: ListPagesModuleData): ListPagesQuery {
  return {
    pagetype: module.pagetype as ListPagesQuery["pagetype"],
    category: module.category,
    tags: module.tags,
    parent: module.parent,
    linkTo: module["link-to"],
    createdAt: module["created-at"],
    updatedAt: module["updated-at"],
    createdBy: module["created-by"],
    rating: module.rating,
    votes: module.votes,
    name: module.name,
    fullname: module.fullname,
    range: module.range as ListPagesQuery["range"],
    order: module.order,
    offset: module.offset,
    limit: module.limit,
    perPage: module["per-page"],
    reverse: module.reverse,
    dataFormFields: extractDataFormFields(module.attributes),
  };
}

function extractDataFormFields(
  attributes: Record<string, string>,
): Record<string, string> | undefined {
  const fields: Record<string, string> = {};
  let hasFields = false;

  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith("_")) {
      fields[key.slice(1)] = value;
      hasFields = true;
    }
  }

  return hasFields ? fields : undefined;
}
