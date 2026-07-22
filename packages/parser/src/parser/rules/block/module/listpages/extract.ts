/**
 *
 * Data requirement extraction from parsed ASTs.
 *
 * After parsing, the AST may contain ListPages and ListUsers module nodes that
 * need external data (page lists, user information) to be resolved. This module
 * analyzes the AST to find all such modules, determines what variables their
 * templates use (and therefore what data fields the external provider must supply),
 * and pre-compiles their templates for efficient rendering during the resolution phase.
 *
 * The extraction result includes:
 * - `DataRequirements` listing all ListPages/ListUsers queries with their needed variables
 * - Pre-compiled template functions keyed by module ID for fast rendering
 *
 * This is the first phase of the three-phase ListPages lifecycle:
 * 1. **Extract** (this module) - Analyze AST, determine data needs, compile templates
 * 2. **Fetch** (external) - Application fetches data based on requirements
 * 3. **Resolve** - Substitute fetched data into compiled templates and re-parse
 *
 * @module
 */

import type { SyntaxTree } from "@wdprlib/ast";
import { walkElements } from "../walk";
import {
  extractListPagesModule,
  isListPagesModule,
  type ListPagesExtractionState,
} from "./extraction/listpages";
import {
  extractListUsersModule,
  isListUsersModule,
  type ListUsersExtractionState,
} from "./extraction/listusers";
import {
  extractTagCloudModule,
  isTagCloudModule,
  type TagCloudExtractionState,
} from "./extraction/tagcloud";
import type { ExtractionResult } from "./extraction/result";
export type { ExtractionResult } from "./extraction/result";

/**
 * Extract all data requirements from a parsed AST.
 *
 * Walks the entire AST to find ListPages and ListUsers module elements,
 * analyzes their templates to determine which variables are used, builds
 * query objects from their attributes, and pre-compiles their templates.
 *
 * Each module is assigned a sequential ID (separate counters for ListPages
 * and ListUsers) that is used to correlate requirements with fetched data
 * and compiled templates during the resolution phase.
 *
 * @param ast - The parsed syntax tree to analyze
 * @returns Extraction result containing requirements and compiled templates
 */
export function extractDataRequirements(ast: SyntaxTree): ExtractionResult {
  const result: ExtractionResult = {
    requirements: {
      listPages: [],
      listUsers: [],
      tagCloud: [],
    },
    compiledListPagesTemplates: new Map(),
    compiledListUsersTemplates: new Map(),
  };

  const listPagesState: ListPagesExtractionState = { nextId: 0 };
  const listUsersState: ListUsersExtractionState = { nextId: 0 };
  const tagCloudState: TagCloudExtractionState = { nextId: 0 };

  walkElements(ast.elements, (element) => {
    if (element.element !== "module") return;

    if (isListPagesModule(element.data)) {
      extractListPagesModule(element.data, listPagesState, result);
    } else if (isListUsersModule(element.data)) {
      extractListUsersModule(element.data, listUsersState, result);
    } else if (isTagCloudModule(element.data)) {
      extractTagCloudModule(element.data, tagCloudState, result);
    }
  });

  return result;
}
