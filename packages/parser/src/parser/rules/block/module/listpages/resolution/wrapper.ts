import type { Element } from "@wdprlib/ast";
import { getModuleParseAst, type ParseFunction } from "../../types";
import type { ListPagesModuleData } from "../resolve";

export function wrapListPagesResult(
  module: ListPagesModuleData,
  items: Element[],
  parse: ParseFunction,
): Element[] {
  if (items.length === 0) {
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
