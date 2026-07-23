import type { Diagnostic, Element, ParseResult, SyntaxTree } from "@wdprlib/ast";
import type { DataProvider } from "../types-common";
import type { ModuleParseResult } from "../types";
import { isListPagesModule, type ListPagesModuleData } from "../listpages/resolve";
import type {
  CompiledTemplate,
  ListPagesDataRequirement,
  ListPagesExternalData,
  VariableContext,
} from "../listpages/types";
import { isListUsersModule } from "../listusers/resolve";
import type {
  ListUsersCompiledTemplate,
  ListUsersDataRequirement,
  ListUsersExternalData,
  ListUsersVariableContext,
} from "../listusers/types";
import { isTagCloudModule, resolveTagCloud } from "../tagcloud/resolve";
import type { TagCloudDataRequirement } from "../tagcloud/types";
import { resolveIfTags } from "../iftags/resolve";
import {
  getGenericElementChildren,
  listElement,
  withGenericElementChildren,
} from "../walk/children";
import { buildListPagesDataMap, buildListUsersDataMap, buildTagCloudDataMap } from "./data-maps";
import { ModuleDocumentRegistry } from "./document";
import { collectStyles, mergeCollectedStyles } from "./styles";

export type AsyncModuleParseFunction = (source: string) => Promise<ModuleParseResult>;

export interface ResolveModulesWithAsyncParseOptions {
  parse: AsyncModuleParseFunction;
  compiledListPagesTemplates: Map<number, CompiledTemplate>;
  compiledListUsersTemplates?: Map<number, ListUsersCompiledTemplate>;
  requirements: {
    listPages?: ListPagesDataRequirement[];
    listUsers?: ListUsersDataRequirement[];
    tagCloud?: TagCloudDataRequirement[];
  };
  urlPath?: string;
  pageTags: string[];
}

export interface AsyncModuleResolutionResult {
  ast: SyntaxTree;
  diagnostics: Diagnostic[];
}

interface ResolutionState {
  listPagesId: number;
  listUsersId: number;
  tagCloudId: number;
}

interface ResolutionContext {
  dataProvider: DataProvider;
  listPagesData: Map<number, ListPagesExternalData>;
  listUsersData: Map<number, ListUsersExternalData>;
  tagCloudData: Awaited<ReturnType<typeof buildTagCloudDataMap>>;
  options: ResolveModulesWithAsyncParseOptions;
  parse: (source: string) => Promise<SyntaxTree>;
}

export async function resolveModulesWithAsyncParse(
  ast: SyntaxTree,
  dataProvider: DataProvider,
  options: ResolveModulesWithAsyncParseOptions,
): Promise<AsyncModuleResolutionResult> {
  const registry = new ModuleDocumentRegistry();
  registry.register(ast);
  const parse = async (source: string): Promise<SyntaxTree> =>
    registry.register(await options.parse(source));

  const [listPagesData, listUsersData, tagCloudData] = await Promise.all([
    buildListPagesDataMap(dataProvider, options.requirements.listPages ?? [], options.urlPath),
    buildListUsersDataMap(dataProvider, options.requirements.listUsers ?? []),
    buildTagCloudDataMap(dataProvider, options.requirements.tagCloud ?? []),
  ]);
  const context: ResolutionContext = {
    dataProvider,
    listPagesData,
    listUsersData,
    tagCloudData,
    options,
    parse,
  };
  const state: ResolutionState = { listPagesId: 0, listUsersId: 0, tagCloudId: 0 };
  const resolvedElements = await resolveElements(ast.elements, context, state);
  const { elements, styles, anchoredStyles } = collectStyles(resolvedElements);
  const intermediate: SyntaxTree = { ...ast, elements };
  const mergedStyles = mergeCollectedStyles(ast.styles, styles, new Map(), anchoredStyles);
  if (mergedStyles.length > 0) intermediate.styles = mergedStyles;
  else delete intermediate.styles;

  return {
    ast: registry.finalize(intermediate, elements, options.pageTags),
    diagnostics: registry.diagnostics,
  };
}

async function resolveElements(
  elements: Element[],
  context: ResolutionContext,
  state: ResolutionState,
): Promise<Element[]> {
  const result: Element[] = [];
  for (const element of elements) {
    if (element.element === "module") {
      const resolved = await resolveModuleElement(element, context, state);
      if (resolved !== null) {
        result.push(...resolved);
        continue;
      }
    }

    if (element.element === "if-tags") {
      const resolution = resolveIfTags(element.data, context.options.pageTags);
      if (resolution.matched) {
        result.push(...(await resolveElements(element.data.elements, context, state)));
      }
      continue;
    }

    result.push(await resolveElementChildren(element, context, state));
  }
  return result;
}

async function resolveModuleElement(
  element: Extract<Element, { element: "module" }>,
  context: ResolutionContext,
  state: ResolutionState,
): Promise<Element[] | null> {
  if (isListPagesModule(element.data)) {
    const id = state.listPagesId++;
    const data = context.listPagesData.get(id);
    const template = context.options.compiledListPagesTemplates.get(id);
    if (data && template) return resolveListPagesAsync(element.data, data, template, context.parse);
    return context.dataProvider.fetchListPages ? [] : [element];
  }
  if (isListUsersModule(element.data)) {
    const id = state.listUsersId++;
    const data = context.listUsersData.get(id);
    const template = context.options.compiledListUsersTemplates?.get(id);
    if (data && template) {
      const variableContext: ListUsersVariableContext = { user: data.user };
      return (await context.parse(template(variableContext))).elements;
    }
    return context.dataProvider.fetchListUsers ? [] : [element];
  }
  if (isTagCloudModule(element.data)) {
    const id = state.tagCloudId++;
    const data = context.tagCloudData.get(id);
    if (data) return resolveTagCloud(element.data, data);
    return context.dataProvider.fetchTagCloud ? [] : [element];
  }
  return null;
}

async function resolveListPagesAsync(
  module: ListPagesModuleData,
  data: ListPagesExternalData,
  template: CompiledTemplate,
  parse: (source: string) => Promise<SyntaxTree>,
): Promise<Element[]> {
  if (data.pages.length === 0) return [];
  const result: Element[] = [];

  if (module["prepend-line"] && !module.separate) {
    result.push(...(await parse(module["prepend-line"])).elements);
  }
  for (let i = 0; i < data.pages.length; i++) {
    const page = data.pages[i];
    if (!page) continue;
    const variableContext: VariableContext = {
      page,
      index: i + 1,
      total: data.totalCount,
      limit: module.limit,
      site: data.site,
    };
    const parsed = await parse(template(variableContext));
    if (module.separate) {
      result.push({
        element: "container",
        data: {
          type: "div",
          attributes: { class: "list-pages-item" },
          elements: parsed.elements,
        },
      });
    } else {
      result.push(...parsed.elements);
    }
  }
  if (module["append-line"] && !module.separate) {
    result.push(...(await parse(module["append-line"])).elements);
  }

  return module.wrapper
    ? [
        {
          element: "container",
          data: {
            type: "div",
            attributes: { class: "list-pages-box" },
            elements: result,
          },
        },
      ]
    : result;
}

async function resolveElementChildren(
  element: Element,
  context: ResolutionContext,
  state: ResolutionState,
): Promise<Element> {
  if (element.element === "list") {
    const items = [];
    for (const item of element.data.items) {
      if (item["item-type"] === "elements") {
        items.push({ ...item, elements: await resolveElements(item.elements, context, state) });
      } else {
        const resolved = (await resolveElements([listElement(item.data)], context, state))[0];
        items.push(resolved?.element === "list" ? { ...item, data: resolved.data } : item);
      }
    }
    return { ...element, data: { ...element.data, items } };
  }
  if (element.element === "table") {
    const rows = [];
    for (const row of element.data.rows) {
      const cells = [];
      for (const cell of row.cells) {
        cells.push({ ...cell, elements: await resolveElements(cell.elements, context, state) });
      }
      rows.push({ ...row, cells });
    }
    return { ...element, data: { ...element.data, rows } };
  }
  if (element.element === "definition-list") {
    const entries = [];
    for (const entry of element.data) {
      entries.push({
        ...entry,
        key: await resolveElements(entry.key, context, state),
        value: await resolveElements(entry.value, context, state),
      });
    }
    return { ...element, data: entries };
  }
  if (element.element === "tab-view") {
    const tabs = [];
    for (const tab of element.data) {
      tabs.push({ ...tab, elements: await resolveElements(tab.elements, context, state) });
    }
    return { ...element, data: tabs };
  }
  const children = getGenericElementChildren(element);
  return children === null
    ? element
    : withGenericElementChildren(element, await resolveElements(children, context, state));
}

export function asParseResult(ast: SyntaxTree, diagnostics: Diagnostic[]): ParseResult {
  return { ast, diagnostics };
}
