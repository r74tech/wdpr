import { DEFAULT_SETTINGS, type PageRef, type WikitextPageContext } from "@wdprlib/ast";
import { parse } from "../parser";
import { extractDataRequirements } from "../parser/rules/block/module/listpages/extract";
import {
  resolveIncludesAsyncWithTrace,
  type AsyncIncludeFetcher,
  type IncludeDependency,
} from "../parser/rules/block/module/include";
import type { DataProvider } from "../parser/rules/block/module/types-common";
import { resolveModulesWithAsyncParse } from "../parser/rules/block/module/resolution/resolve-async";
import type {
  ProcessedWikitextDocument,
  ProcessWikitextCallbackContext,
  ProcessWikitextOptions,
} from "./types";

export async function processWikitext<TPage extends WikitextPageContext>(
  source: string,
  options: ProcessWikitextOptions<TPage>,
): Promise<ProcessedWikitextDocument<TPage>> {
  const settings = options.settings ?? DEFAULT_SETTINGS;
  const callbackContext: ProcessWikitextCallbackContext<TPage> = {
    page: options.page,
    settings,
  };
  const dependencies: IncludeDependency[] = [];
  const fetchInclude = createRequestIncludeFetcher(
    options.dataProvider?.fetchInclude
      ? (pageRef) => options.dataProvider!.fetchInclude!(pageRef, callbackContext)
      : undefined,
  );
  const resolveSource = async (input: string): Promise<string> => {
    if (!fetchInclude) return input;
    const resolution = await resolveIncludesAsyncWithTrace(input, fetchInclude, {
      maxIterations: options.includeMaxIterations,
      settings,
    });
    dependencies.push(...resolution.dependencies);
    return resolution.source;
  };

  const expandedSource = await resolveSource(source);
  const initial = parse(expandedSource, {
    settings,
    pageTags: options.page.tags,
    appendImplicitFootnoteBlock: false,
  });
  const extraction = extractDataRequirements(initial.ast);
  const dataProvider = createModuleDataProvider(options, callbackContext);
  const resolved = await resolveModulesWithAsyncParse(initial.ast, dataProvider, {
    parse: async (fragmentSource) =>
      parse(await resolveSource(fragmentSource), {
        settings,
        pageTags: options.page.tags,
        appendImplicitFootnoteBlock: false,
      }),
    compiledListPagesTemplates: extraction.compiledListPagesTemplates,
    compiledListUsersTemplates: extraction.compiledListUsersTemplates,
    requirements: extraction.requirements,
    urlPath: options.page.urlPath,
    pageTags: options.page.tags,
  });

  return {
    ast: resolved.ast,
    page: options.page,
    settings,
    diagnostics: [...initial.diagnostics, ...resolved.diagnostics],
    dependencies,
  };
}

function createModuleDataProvider<TPage extends WikitextPageContext>(
  options: ProcessWikitextOptions<TPage>,
  context: ProcessWikitextCallbackContext<TPage>,
): DataProvider {
  const provider = options.dataProvider;
  return {
    fetchListPages: provider?.fetchListPages
      ? (query, requirement) => provider.fetchListPages!(query, requirement, context)
      : undefined,
    fetchListUsers: provider?.fetchListUsers
      ? (requirement) => provider.fetchListUsers!(requirement, context)
      : undefined,
    fetchTagCloud: provider?.fetchTagCloud
      ? (requirement) => provider.fetchTagCloud!(requirement, context)
      : undefined,
    getPageTags: () => options.page.tags,
  };
}

function createRequestIncludeFetcher(
  fetcher: AsyncIncludeFetcher | undefined,
): AsyncIncludeFetcher | undefined {
  if (!fetcher) return undefined;
  const cache = new Map<string, Promise<string | null>>();
  return (pageRef: PageRef): Promise<string | null> => {
    const key = `${pageRef.site ?? ""}:${pageRef.page.toLowerCase()}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const result = fetcher(pageRef).catch(() => null);
    cache.set(key, result);
    return result;
  };
}
