import type { Element } from "@wdprlib/ast";
import type { CompiledTemplate, ListPagesExternalData, VariableContext } from "../types";
import type { ParseFunction } from "../../types";
import type { ListPagesModuleData } from "../resolve";

export function renderListPagesItems(
  module: ListPagesModuleData,
  data: ListPagesExternalData,
  compiledTemplate: CompiledTemplate,
  parse: ParseFunction,
): Element[] {
  const items: Element[] = [];

  for (let i = 0; i < data.pages.length; i++) {
    const page = data.pages[i];
    if (!page) continue;

    const ctx: VariableContext = {
      page,
      index: i + 1,
      total: data.totalCount,
      limit: module.limit,
      site: data.site,
    };

    const itemAst = parse(compiledTemplate(ctx));

    if (module.separate) {
      items.push({
        element: "container",
        data: {
          type: "div",
          attributes: { class: "list-pages-item" },
          elements: itemAst.elements,
        },
      });
    } else {
      items.push(...itemAst.elements);
    }
  }

  return items;
}
