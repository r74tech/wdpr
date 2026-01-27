/**
 * ListPages module
 *
 * Exports parser, types, extraction, and resolution functionality.
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
