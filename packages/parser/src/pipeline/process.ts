import {
  DEFAULT_SETTINGS,
  type Diagnostic,
  type PageRef,
  type WikitextPageContext,
} from "@wdprlib/ast";
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

const DEFAULT_MODULE_MAX_PASSES = 5;
const PIPELINE_DIAGNOSTIC_POSITION = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
};

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
  const diagnostics: Diagnostic[] = [];
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
    if (resolution.reachedMaxIterations) {
      diagnostics.push(
        createLimitDiagnostic(
          "include-resolution-limit",
          `Include expansion stopped after ${options.includeMaxIterations ?? 10} iterations.`,
        ),
      );
    }
    return resolution.source;
  };

  const expandedSource = await resolveSource(source);
  const initial = parse(expandedSource, {
    settings,
    pageTags: options.page.tags,
    appendImplicitFootnoteBlock: false,
  });
  diagnostics.push(...initial.diagnostics);
  const dataProvider = createModuleDataProvider(options, callbackContext);
  const parseFragment = async (fragmentSource: string) =>
    parse(await resolveSource(fragmentSource), {
      settings,
      pageTags: options.page.tags,
      appendImplicitFootnoteBlock: false,
    });
  let ast = initial.ast;

  for (let pass = 0; pass < DEFAULT_MODULE_MAX_PASSES; pass++) {
    const extraction = extractDataRequirements(ast);
    if (pass > 0 && !hasResolvableRequirements(extraction.requirements, options.dataProvider)) {
      break;
    }

    const resolved = await resolveModulesWithAsyncParse(ast, dataProvider, {
      parse: parseFragment,
      compiledListPagesTemplates: extraction.compiledListPagesTemplates,
      compiledListUsersTemplates: extraction.compiledListUsersTemplates,
      requirements: extraction.requirements,
      urlPath: options.page.urlPath,
      pageTags: options.page.tags,
    });
    ast = resolved.ast;
    diagnostics.push(...resolved.diagnostics);
  }

  if (hasResolvableRequirements(extractDataRequirements(ast).requirements, options.dataProvider)) {
    diagnostics.push(
      createLimitDiagnostic(
        "module-resolution-limit",
        `Module resolution stopped after ${DEFAULT_MODULE_MAX_PASSES} passes.`,
      ),
    );
  }

  return {
    ast,
    page: options.page,
    settings,
    diagnostics,
    dependencies,
  };
}

function hasResolvableRequirements(
  requirements: ReturnType<typeof extractDataRequirements>["requirements"],
  provider:
    | {
        fetchListPages?: unknown;
        fetchListUsers?: unknown;
        fetchTagCloud?: unknown;
      }
    | undefined,
): boolean {
  return Boolean(
    (provider?.fetchListPages && requirements.listPages.length > 0) ||
    (provider?.fetchListUsers && requirements.listUsers.length > 0) ||
    (provider?.fetchTagCloud && requirements.tagCloud.length > 0),
  );
}

function createLimitDiagnostic(code: string, message: string): Diagnostic {
  return {
    severity: "warning",
    code,
    message,
    position: PIPELINE_DIAGNOSTIC_POSITION,
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
