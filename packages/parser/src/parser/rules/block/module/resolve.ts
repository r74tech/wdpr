/**
 * Unified resolver that walks a parsed AST and expands dynamic modules.
 *
 * Handles three module families in a single traversal:
 *
 * - **ListPages** — fetches page data via {@link DataProvider.fetchListPages},
 *   resolves `@URL` parameters from the page path (HPC support), and
 *   expands `%%variable%%` templates.
 * - **ListUsers** — fetches user data via {@link DataProvider.fetchListUsers}
 *   and expands `%%variable%%` templates.
 * - **IfTags** — evaluates tag conditions against the current page's tags
 *   (from {@link DataProvider.getPageTags}) and keeps or discards content.
 *
 * The main entry point is {@link resolveModules}.
 *
 * @module
 */

import type { Diagnostic, Element, SyntaxTree } from "@wdprlib/ast";
import type { DataProvider } from "./types-common";
import { resolveIncludes } from "./include";
import type { ListPagesDataRequirement, CompiledTemplate } from "./listpages/types";
import type { ListUsersDataRequirement, ListUsersCompiledTemplate } from "./listusers/types";
import type { TagCloudDataRequirement } from "./tagcloud/types";
import type { ParseFunction } from "./listpages/resolve";
import {
  buildListPagesContext,
  buildListUsersContext,
  buildTagCloudContext,
} from "./resolution/contexts";
import { walkAndResolve } from "./resolution/walk-resolve";
import { collectStyles, mergeCollectedStyles } from "./resolution/styles";
import { containsSyntaxFootnoteBlock, ModuleDocumentRegistry } from "./resolution/document";

const MODULE_SECONDARY_INCLUDE_MAX_ITERATIONS = 5;

// Re-export from listpages/resolve for external use
export type { ParseFunction } from "./listpages/resolve";

/**
 * Transform module-generated wikitext before it is parsed back into AST nodes.
 *
 * Applications can use this hook to inject include resolution, parse caches, or
 * diagnostics for ListPages/ListUsers secondary transformations.
 *
 * This hook receives the string after module variables such as `%%title%%` have
 * already been substituted. Returning a different string changes what is parsed
 * for that module item. When this hook is supplied it replaces the built-in
 * secondary include pass, so callers that still need Wikidot-style secondary
 * includes must call `resolveIncludes()` or equivalent logic from the hook.
 */
export type ModuleSourceTransform = (source: string) => string;

/**
 * Configuration for {@link resolveModules}.
 *
 * Callers must supply pre-extracted requirements and pre-compiled
 * templates (obtained from `extractDataRequirements()` and
 * `compileTemplate()` / `compileListUsersTemplate()`).
 *
 * @group Module Resolution
 */
export interface ResolveOptions {
  /** Parser function used to re-parse expanded template markup into AST nodes */
  parse: ParseFunction;

  /** Pre-compiled ListPages body templates, keyed by requirement ID */
  compiledListPagesTemplates: Map<number, CompiledTemplate>;

  /** Pre-compiled ListUsers body templates, keyed by requirement ID */
  compiledListUsersTemplates?: Map<number, ListUsersCompiledTemplate>;

  /**
   * Data requirements grouped by module type.
   * Obtained from `extractDataRequirements()`.
   */
  requirements: {
    listPages?: ListPagesDataRequirement[];
    listUsers?: ListUsersDataRequirement[];
    tagCloud?: TagCloudDataRequirement[];
  };

  /**
   * URL path for `@URL` parameter resolution (HPC / pagination support).
   *
   * Wikidot encodes pagination state in the URL path as key/value pairs
   * after the page name, e.g. `"/scp-001/offset/10/page2_limit/5"`.
   * When provided, `@URL` references in ListPages queries are replaced
   * with the corresponding values from this path.
   */
  urlPath?: string;

  /**
   * Maximum include expansion iterations for secondary transformations inside
   * modules such as ListPages/ListUsers. Defaults to Wikidot's observed
   * secondary transformation limit.
   */
  includeMaxIterations?: number;

  /**
   * Transform module-generated wikitext before re-parsing it.
   *
   * When omitted, `resolveModules()` preserves the existing default: if
   * `dataProvider.fetchInclude` is present, secondary `[[include]]` expansion
   * is performed with `includeMaxIterations`; otherwise the source is parsed
   * unchanged. When supplied, this hook owns the whole transformation.
   *
   * This is the extension point for application-level parse/include caches. The
   * parser package does not persist cache entries itself because cache keys and
   * invalidation depend on site/page revisions, tags, URL parameters, and user
   * state outside wdpr.
   */
  transformModuleSource?: ModuleSourceTransform;

  /** Receives diagnostics emitted by ListPages/ListUsers secondary parses. */
  onDiagnostics?: (diagnostics: Diagnostic[]) => void;
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
  const registry = new ModuleDocumentRegistry();
  registry.register(ast);
  const parse = createModuleParseFunction(options, dataProvider, registry);
  const listPagesCtx = await buildListPagesContext(
    dataProvider,
    options.requirements.listPages ?? [],
    options.compiledListPagesTemplates,
    parse,
    options.urlPath,
  );
  const listUsersCtx = await buildListUsersContext(
    dataProvider,
    options.requirements.listUsers ?? [],
    options.compiledListUsersTemplates,
    parse,
  );
  const tagCloudCtx = await buildTagCloudContext(dataProvider, options.requirements.tagCloud ?? []);
  const pageTags = dataProvider.getPageTags?.() ?? null;
  const resolvedStyleSlots = new Map<number, string[]>();
  const routedStyleAnchors = new WeakSet<Element>();

  // Resolve AST
  const resolvedElements = walkAndResolve(ast.elements, {
    listPages: listPagesCtx,
    listUsers: listUsersCtx,
    tagCloud: tagCloudCtx,
    fetchListPagesProvided: dataProvider.fetchListPages !== undefined,
    fetchListUsersProvided: dataProvider.fetchListUsers !== undefined,
    fetchTagCloudProvided: dataProvider.fetchTagCloud !== undefined,
    pageTags,
    listPagesIdCounter: 0,
    listUsersIdCounter: 0,
    tagCloudIdCounter: 0,
    resolvedStyleSlots,
    routedStyleAnchors,
  });

  // Collect style elements from resolved AST
  const {
    elements: finalElements,
    styles,
    anchoredStyles,
  } = collectStyles(resolvedElements.elements, routedStyleAnchors);

  const result: SyntaxTree = {
    ...ast,
    elements: finalElements,
  };

  const mergedStyles = mergeCollectedStyles(ast.styles, styles, resolvedStyleSlots, anchoredStyles);
  if (mergedStyles.length > 0) result.styles = mergedStyles;

  options.onDiagnostics?.(registry.diagnostics);
  return registry.finalize(
    result,
    finalElements,
    pageTags,
    containsSyntaxFootnoteBlock(ast.elements),
  );
}

function createModuleParseFunction(
  options: ResolveOptions,
  dataProvider: DataProvider,
  registry: ModuleDocumentRegistry,
): ParseFunction {
  const transform = createModuleSourceTransform(options, dataProvider);
  return (source: string) =>
    registry.register(options.parse(transform ? transform(source) : source), {
      stripLegacyImplicitFootnoteBlock: true,
    });
}

function createModuleSourceTransform(
  options: ResolveOptions,
  dataProvider: DataProvider,
): ModuleSourceTransform | null {
  if (options.transformModuleSource) {
    return options.transformModuleSource;
  }

  if (!dataProvider.fetchInclude) {
    return null;
  }

  return (source: string) =>
    resolveIncludes(source, dataProvider.fetchInclude!, {
      maxIterations: options.includeMaxIterations ?? MODULE_SECONDARY_INCLUDE_MAX_ITERATIONS,
    });
}
