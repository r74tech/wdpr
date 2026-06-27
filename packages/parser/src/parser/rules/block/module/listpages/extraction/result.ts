import type { DataRequirements, CompiledTemplate } from "../types";
import type { ListUsersCompiledTemplate } from "../../listusers/types";

/**
 * Complete result of extracting data requirements from an AST.
 *
 * Contains everything needed to fetch external data and then resolve modules:
 * the data requirements tell the application what to fetch, and the pre-compiled
 * templates are used during the resolution phase to efficiently render results.
 */
export interface ExtractionResult {
  /** Data requirements for external fetching */
  requirements: DataRequirements;
  /** Pre-compiled ListPages templates keyed by module id */
  compiledListPagesTemplates: Map<number, CompiledTemplate>;
  /** Pre-compiled ListUsers templates keyed by module id */
  compiledListUsersTemplates: Map<number, ListUsersCompiledTemplate>;
}
