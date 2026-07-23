/**
 * Module system for Wikidot dynamic constructs.
 *
 * Wikidot supports several "module" blocks (`[[module ListPages]]`,
 * `[[module ListUsers]]`, `[[module CSS]]`, etc.) and pseudo-blocks
 * (`[[include]]`, `[[iftags]]`) that require external data to resolve.
 *
 * This barrel module re-exports everything needed to:
 *
 * 1. **Extract** data requirements from a parsed AST
 *    ({@link extractDataRequirements})
 * 2. **Compile** body templates that contain `%%variable%%` placeholders
 *    ({@link compileTemplate}, {@link compileListUsersTemplate})
 * 3. **Resolve** modules by injecting fetched data back into the AST
 *    ({@link resolveModules})
 * 4. **Resolve includes** by fetching and inlining included pages
 *    ({@link resolveIncludes})
 *
 * @module
 */

// Module rule types and registry
export type { ModuleParseResult, ModuleRule } from "./types";
export { MODULE_RULES, getModuleRuleByName } from "./mapping";
export { moduleRule } from "./rule";

// Module parsers
export { rateModuleRule } from "./rate/index";
export { cssModuleRule } from "./css/index";
export { backlinksModuleRule } from "./backlinks/index";
export { categoriesModuleRule } from "./categories/index";
export { joinModuleRule } from "./join/index";
export { pageTreeModuleRule } from "./page-tree/index";
export { listPagesModuleRule } from "./listpages/parser";
export { listUsersModuleRule } from "./listusers/parser";

// Module data types (parser-only modules)
export type { RateModuleData } from "./rate/types";
export type { BacklinksModuleData } from "./backlinks/types";
export type { CategoriesModuleData } from "./categories/types";
export type { JoinModuleData } from "./join/types";
export type { PageTreeModuleData } from "./page-tree/types";

// Common types
export type { DataProvider } from "./types-common";

// ListPages module
export type {
  ListPagesQuery,
  ListPagesVariable,
  ListPagesDataRequirement,
  DataRequirements,
  UserInfo,
  PageData,
  SiteContext,
  ListPagesExternalData,
  ListPagesDataFetcher,
  VariableContext,
  CompiledTemplate,
  ExtractionResult,
  ParseFunction,
  ListPagesModuleData,
  // Normalized types
  NormalizedListPagesQuery,
  NormalizedTags,
  NormalizedCategory,
  NormalizedOrder,
  NormalizedParent,
  NormalizedDateSelector,
  NormalizedNumericSelector,
} from "./listpages";
export {
  extractDataRequirements,
  isListPagesModule,
  resolveListPages,
  compileTemplate,
  // Query normalization (for advanced use cases)
  normalizeQuery,
  parseTags,
  parseCategory,
  parseOrder,
  parseParent,
  parseDateSelector,
  parseNumericSelector,
} from "./listpages";

// IfTags module
export type { TagCondition, IfTagsResolver, IfTagsData, IfTagsResolveResult } from "./iftags";
export {
  parseTagCondition,
  evaluateTagCondition,
  isIfTagsElement,
  resolveIfTags,
  preprocessIftags,
} from "./iftags";

// Include module
export type { IncludeFetcher, AsyncIncludeFetcher, ResolveIncludesOptions } from "./include";
export type {
  IncludeReference,
  IncludeDependency,
  IncludeIterationTrace,
  ResolveIncludesTraceResult,
} from "./include";
export {
  extractIncludeReferences,
  resolveIncludes,
  resolveIncludesAsync,
  resolveIncludesAsyncWithTrace,
  resolveIncludesWithTrace,
} from "./include";

// ListUsers module
export type {
  ListUsersVariable,
  ListUsersUserData,
  ListUsersDataRequirement,
  ListUsersExternalData,
  ListUsersDataFetcher,
  ListUsersVariableContext,
  ListUsersCompiledTemplate,
  ListUsersModuleData,
} from "./listusers";
export {
  listUsersModuleRule as listUsersRule,
  extractListUsersVariables,
  compileListUsersTemplate,
  isListUsersModule,
  resolveListUsers,
} from "./listusers";

// TagCloud module
export type {
  TagCloudDataRequirement,
  TagCloudTagData,
  TagCloudExternalData,
  TagCloudDataFetcher,
  TagCloudModuleData,
} from "./tagcloud";
export { tagCloudModuleRule as tagCloudRule, isTagCloudModule, resolveTagCloud } from "./tagcloud";

// Module resolver
export type { ModuleSourceTransform, ResolveOptions } from "./resolve";
export { resolveModules } from "./resolve";
export { STYLE_SLOT_PREFIX } from "@wdprlib/ast";
