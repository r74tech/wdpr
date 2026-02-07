/**
 * Common resolver for modules that require external data
 *
 * Handles:
 * - ListPages module resolution (with automatic @URL parameter resolution)
 * - IfTags condition evaluation
 */

import type { Element, SyntaxTree } from "@wdprlib/ast";
import type { DataProvider } from "./types-common";
import { walkElements, mapElementChildren, mapElementChildrenWithState } from "./walk";
import type {
  ListPagesDataRequirement,
  ListPagesExternalData,
  CompiledTemplate,
} from "./listpages/types";
import type {
  ListUsersDataRequirement,
  ListUsersExternalData,
  ListUsersCompiledTemplate,
} from "./listusers/types";
import { isListPagesModule, resolveListPages, type ParseFunction } from "./listpages/resolve";
import { isListUsersModule, resolveListUsers } from "./listusers/resolve";
import { isIfTagsElement, resolveIfTags, type IfTagsData } from "./iftags/resolve";
import { parseUrlParams, resolveAndNormalizeQuery } from "./listpages/url-resolver";

// Re-export from listpages/resolve for external use
export type { ParseFunction } from "./listpages/resolve";

/**
 * Options for resolving modules
 */
export interface ResolveOptions {
  /** Parser function for re-parsing templates */
  parse: ParseFunction;
  /** Pre-compiled templates for ListPages */
  compiledListPagesTemplates: Map<number, CompiledTemplate>;
  /** Pre-compiled templates for ListUsers */
  compiledListUsersTemplates?: Map<number, ListUsersCompiledTemplate>;
  /** Data requirements grouped by module type */
  requirements: {
    listPages?: ListPagesDataRequirement[];
    listUsers?: ListUsersDataRequirement[];
  };
  /**
   * URL path for `@URL` parameter resolution (HPC support)
   * Format: "/page-name/param/value/param/value"
   * Example: "/scp-001/offset/10/page2_limit/5"
   */
  urlPath?: string;
}

/**
 * Context for ListPages resolution (internal)
 */
interface ListPagesContext {
  dataMap: Map<number, ListPagesExternalData>;
  compiledTemplates: Map<number, CompiledTemplate>;
  parse: ParseFunction;
}

/**
 * Context for ListUsers resolution (internal)
 */
interface ListUsersContext {
  dataMap: Map<number, ListUsersExternalData>;
  compiledTemplates: Map<number, ListUsersCompiledTemplate>;
  parse: ParseFunction;
}

/**
 * Resolve all modules in the AST
 *
 * Fetches data for each module using the provided callback,
 * then expands the modules with the fetched data.
 *
 * Handles:
 * - ListPages: fetches page data and expands templates
 * - IfTags: evaluates tag conditions and includes/excludes content
 *
 * @param ast - Parsed AST
 * @param dataProvider - Callback provider to fetch data for each module
 * @param options - Resolution options including requirements
 */
export async function resolveModules(
  ast: SyntaxTree,
  dataProvider: DataProvider,
  options: ResolveOptions,
): Promise<SyntaxTree> {
  // Build ListPages context if requirements provided
  let listPagesCtx: ListPagesContext | null = null;
  const listPagesReqs = options.requirements.listPages ?? [];

  if (listPagesReqs.length > 0 && dataProvider.fetchListPages) {
    const dataMap = new Map<number, ListPagesExternalData>();

    // Parse URL parameters once for all modules
    const urlParams = parseUrlParams(options.urlPath ?? "");

    for (const req of listPagesReqs) {
      // Resolve @URL parameters and normalize query
      const normalizedQuery = resolveAndNormalizeQuery(req, urlParams);
      const data = await dataProvider.fetchListPages(normalizedQuery, req);
      if (data) {
        dataMap.set(req.id, data);
      }
    }

    if (dataMap.size > 0) {
      listPagesCtx = {
        dataMap,
        compiledTemplates: options.compiledListPagesTemplates,
        parse: options.parse,
      };
    }
  }

  // Build ListUsers context if requirements provided
  let listUsersCtx: ListUsersContext | null = null;
  const listUsersReqs = options.requirements.listUsers ?? [];

  if (listUsersReqs.length > 0 && dataProvider.fetchListUsers) {
    const dataMap = new Map<number, ListUsersExternalData>();

    for (const req of listUsersReqs) {
      const data = await dataProvider.fetchListUsers(req);
      if (data) {
        dataMap.set(req.id, data);
      }
    }

    if (dataMap.size > 0) {
      listUsersCtx = {
        dataMap,
        compiledTemplates: options.compiledListUsersTemplates ?? new Map(),
        parse: options.parse,
      };
    }
  }

  // Get page tags if callback provided
  const pageTags = dataProvider.getPageTags?.() ?? null;

  // Resolve AST
  const resolvedElements = walkAndResolve(ast.elements, {
    listPages: listPagesCtx,
    listUsers: listUsersCtx,
    fetchListPagesProvided: dataProvider.fetchListPages !== undefined,
    fetchListUsersProvided: dataProvider.fetchListUsers !== undefined,
    pageTags,
    listPagesIdCounter: 0,
    listUsersIdCounter: 0,
  });

  // Collect style elements from resolved AST
  const { elements: finalElements, styles } = collectStyles(resolvedElements.elements);

  const result: SyntaxTree = {
    ...ast,
    elements: finalElements,
  };

  if (styles.length > 0) {
    result.styles = styles;
  }

  return result;
}

/**
 * Resolution context passed through AST traversal
 */
interface WalkContext {
  listPages: ListPagesContext | null;
  listUsers: ListUsersContext | null;
  /** Whether fetchListPages callback was provided (even if no data returned) */
  fetchListPagesProvided: boolean;
  /** Whether fetchListUsers callback was provided (even if no data returned) */
  fetchListUsersProvided: boolean;
  pageTags: string[] | null;
  listPagesIdCounter: number;
  listUsersIdCounter: number;
}

interface WalkResult {
  elements: Element[];
  nextListPagesId: number;
  nextListUsersId: number;
}

/**
 * Walk AST and resolve modules/iftags
 */
function walkAndResolve(elements: Element[], ctx: WalkContext): WalkResult {
  const result: Element[] = [];
  let listPagesId = ctx.listPagesIdCounter;
  let listUsersId = ctx.listUsersIdCounter;

  for (const element of elements) {
    // ListPages module
    if (element.element === "module" && isListPagesModule(element.data)) {
      if (ctx.listPages) {
        const moduleData = ctx.listPages.dataMap.get(listPagesId);
        const template = ctx.listPages.compiledTemplates.get(listPagesId);

        if (moduleData && template) {
          const resolved = resolveListPages(
            element.data,
            moduleData,
            template,
            ctx.listPages.parse,
          );
          result.push(...resolved);
        }
      } else if (!ctx.fetchListPagesProvided) {
        result.push(element);
      }
      listPagesId++;
      continue;
    }

    // ListUsers module
    if (element.element === "module" && isListUsersModule(element.data)) {
      if (ctx.listUsers) {
        const moduleData = ctx.listUsers.dataMap.get(listUsersId);
        const template = ctx.listUsers.compiledTemplates.get(listUsersId);

        if (moduleData && template) {
          const resolved = resolveListUsers(
            element.data,
            moduleData,
            template,
            ctx.listUsers.parse,
          );
          result.push(...resolved);
        }
      } else if (!ctx.fetchListUsersProvided) {
        result.push(element);
      }
      listUsersId++;
      continue;
    }

    // IfTags
    if (isIfTagsElement(element)) {
      const ifTagsData = element.data as IfTagsData;
      const resolveResult = resolveIfTags(ifTagsData, ctx.pageTags);

      if (resolveResult.evaluated) {
        if (resolveResult.matched) {
          const childResult = walkAndResolve(ifTagsData.elements, {
            ...ctx,
            listPagesIdCounter: listPagesId,
            listUsersIdCounter: listUsersId,
          });
          result.push(...childResult.elements);
          listPagesId = childResult.nextListPagesId;
          listUsersId = childResult.nextListUsersId;
        } else {
          const counts = countModulesInElements(ifTagsData.elements);
          listPagesId += counts.listPages;
          listUsersId += counts.listUsers;
        }
      } else {
        const childResult = walkAndResolve(ifTagsData.elements, {
          ...ctx,
          listPagesIdCounter: listPagesId,
          listUsersIdCounter: listUsersId,
        });
        result.push({
          element: "if-tags",
          data: {
            ...ifTagsData,
            elements: childResult.elements,
          },
        });
        listPagesId = childResult.nextListPagesId;
        listUsersId = childResult.nextListUsersId;
      }
      continue;
    }

    // Recurse into child elements (list, table, definition-list, tab-view, generic)
    const mapped = mapElementChildrenWithState(
      element,
      { listPagesId, listUsersId },
      (children, state) => {
        const childResult = walkAndResolve(children, {
          ...ctx,
          listPagesIdCounter: state.listPagesId,
          listUsersIdCounter: state.listUsersId,
        });
        return {
          elements: childResult.elements,
          state: {
            listPagesId: childResult.nextListPagesId,
            listUsersId: childResult.nextListUsersId,
          },
        };
      },
    );
    result.push(mapped.element);
    listPagesId = mapped.state.listPagesId;
    listUsersId = mapped.state.listUsersId;
  }

  return { elements: result, nextListPagesId: listPagesId, nextListUsersId: listUsersId };
}

/**
 * Count resolved modules in elements without resolving them
 *
 * Used to advance ID counters without expensive resolution when
 * IfTags condition doesn't match (elements are skipped but IDs must sync)
 */
function countModulesInElements(elements: Element[]): { listPages: number; listUsers: number } {
  let listPages = 0;
  let listUsers = 0;
  walkElements(elements, (element) => {
    if (element.element === "module") {
      if (isListPagesModule(element.data)) {
        listPages++;
      } else if (isListUsersModule(element.data)) {
        listUsers++;
      }
    }
  });
  return { listPages, listUsers };
}

/**
 * Collect and remove style elements from the AST.
 *
 * Walks the element tree recursively, extracting style elements
 * from any depth and returning them separately.
 * The order of collected styles reflects their appearance order in the AST.
 */
function collectStyles(elements: Element[]): { elements: Element[]; styles: string[] } {
  const styles: string[] = [];
  const filtered = collectStylesFromElements(elements, styles);
  return { elements: filtered, styles };
}

function collectStylesFromElements(elements: Element[], styles: string[]): Element[] {
  const result: Element[] = [];

  for (const element of elements) {
    if (element.element === "style") {
      styles.push(element.data as string);
      continue;
    }

    // Recurse into children using mapElementChildren
    const mapped = mapElementChildren(element, (children) =>
      collectStylesFromElements(children, styles),
    );
    result.push(mapped);
  }

  return result;
}
