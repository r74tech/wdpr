/**
 *
 * ListPages module for Wikidot's `[[module ListPages ...]]` block.
 *
 * This is the most feature-rich Wikidot module, enabling dynamic page listings
 * with filtering, sorting, pagination, and template-based rendering. The module
 * follows a three-phase lifecycle:
 *
 * 1. **Parse** - Convert `[[module ListPages ...]]` markup into an AST node
 * 2. **Extract** - Analyze the AST to determine what data is needed (queries, template variables)
 * 3. **Resolve** - Substitute fetched data into templates and re-parse as wikitext
 *
 * This barrel module re-exports all public types and functions from the sub-modules:
 * - `parser` - Module rule for parsing ListPages markup
 * - `types` - Query, variable, data requirement, and normalized query types
 * - `extract` - AST analysis and data requirement extraction
 * - `resolve` - Data substitution and template rendering
 * - `compiler` - Template string compilation into executable functions
 * - `url-resolver` - `@URL|default` parameter resolution for HPC support
 * - `normalize` - Raw query string parsing into structured types
 *
 * @module
 */

// Parser
export { listPagesModuleRule } from "./parser";

// Types
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
  // Normalized types
  NormalizedListPagesQuery,
  NormalizedTags,
  NormalizedCategory,
  NormalizedOrder,
  NormalizedParent,
  NormalizedDateSelector,
  NormalizedNumericSelector,
  OrderField,
  OrderDirection,
  DateComparisonOp,
  NumericComparisonOp,
} from "./types";

// Extraction
export type { ExtractionResult } from "./extract";
export { extractDataRequirements } from "./extract";

// Resolution
export type { ParseFunction, ListPagesModuleData } from "./resolve";
export { isListPagesModule, resolveListPages } from "./resolve";
export { definePageData } from "./types/external-data";
export { matchesListPagesSelectors } from "./selectors";

// Compiler
export { compileTemplate } from "./compiler";

// URL Resolution
export {
  parseUrlParams,
  resolveUrlValue,
  resolveQuery,
  resolveAndNormalizeQuery,
} from "./url-resolver";

// Query Normalization
export {
  normalizeQuery,
  parseTags,
  parseCategory,
  parseOrder,
  parseParent,
  parseDateSelector,
  parseNumericSelector,
} from "./normalize";
