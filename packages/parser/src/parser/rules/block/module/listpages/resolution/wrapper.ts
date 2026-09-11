import type { Element } from "@wdprlib/ast";
import { getModuleParseAst, type ParseFunction } from "../../types";
import type { ListPagesModuleData } from "../resolve";
import type { ListPagesExternalData } from "../types";
import { createListPagesPager } from "./pager";

export function wrapListPagesResult(
  module: ListPagesModuleData,
  items: Element[],
  parse: ParseFunction,
  data?: ListPagesExternalData,
): Element[] {
  if (items.length === 0 && (!data || data.pages.length === 0)) {
    return [];
  }

  const result: Element[] = [];

  if (module["prepend-line"] && !module.separate) {
    const prependAst = getModuleParseAst(parse(module["prepend-line"]));
    result.push(...prependAst.elements);
  }

  result.push(...items);

  if (module["append-line"] && !module.separate) {
    const appendAst = getModuleParseAst(parse(module["append-line"]));
    result.push(...appendAst.elements);
  }

  if (data) result.push(...createListPagesPager(data));

  if (module.wrapper) {
    return [
      {
        element: "container",
        data: {
          type: "div",
          attributes: { class: "list-pages-box" },
          elements: result,
        },
      },
    ];
  }

  return result;
}
