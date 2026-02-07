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

import type { SyntaxTree, Module } from "@wdprlib/ast";
import type {
  DataRequirements,
  ListPagesQuery,
  ListPagesVariable,
  CompiledTemplate,
} from "./types";
import type { ListUsersCompiledTemplate } from "../listusers/types";
import { compileTemplate } from "./compiler";
import { extractListUsersVariables, compileListUsersTemplate } from "../listusers/extract";
import { walkElements } from "../walk";

/**
 * Type guard to narrow a Module union to the list-pages variant.
 *
 * @param module - A Module discriminated union value
 * @returns true if the module is a list-pages module
 */
function isListPagesModule(module: Module): module is Extract<Module, { module: "list-pages" }> {
  return module.module === "list-pages";
}

/**
 * Regex pattern for matching ListPages template variables.
 *
 * Matches `%%name%%`, `%%name{param}%%`, `%%name(param)%%`, and `%%name|format%%`.
 * The captured groups are: [1] variable name, [2] brace parameter, [3] paren parameter,
 * [4] format/pipe parameter.
 */
const VARIABLE_REGEX = /%%([a-z_]+)(?:\{([^}]+)\})?(?:\((\d+)\))?(?:\|([^%]+))?%%/gi;

/**
 * Default template used when a ListPages module has no body specified.
 * This matches Wikidot's built-in default template that shows title, author, date, and summary.
 */
const DEFAULT_BODY_TEMPLATE = `+ %%title_linked%%

by %%created_by_linked%% %%created_at%%

%%summary%%`;

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

/**
 * Narrowed type for the list-pages variant of the Module union.
 * Used internally for type-safe access to list-pages-specific fields.
 */
type ListPagesModuleData = Extract<Module, { module: "list-pages" }>;

/**
 * Type guard to narrow a Module union to the list-users variant.
 *
 * @param module - A Module discriminated union value
 * @returns true if the module is a list-users module
 */
function isListUsersModule(module: Module): module is Extract<Module, { module: "list-users" }> {
  return module.module === "list-users";
}

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
  const requirements: DataRequirements = {
    listPages: [],
    listUsers: [],
  };
  const compiledListPagesTemplates = new Map<number, CompiledTemplate>();
  const compiledListUsersTemplates = new Map<number, ListUsersCompiledTemplate>();

  let listPagesIdCounter = 0;
  let listUsersIdCounter = 0;

  walkElements(ast.elements, (element) => {
    if (element.element !== "module") return;

    if (isListPagesModule(element.data)) {
      const listPages = element.data;
      const id = listPagesIdCounter++;

      // Get body template (use Wikidot default when not specified)
      const body = listPages.body ?? DEFAULT_BODY_TEMPLATE;

      // Extract needed variables from template
      const extraction = extractVariablesFromTemplate(body);

      // Build query from module parameters
      const query = buildQuery(listPages);

      // Get urlAttrPrefix from parsed module data (kebab-case key)
      const urlAttrPrefix = listPages["url-attr-prefix"];

      // All raw attributes (for @URL resolution by external apps)
      const rawAttributes = listPages.attributes ?? {};

      requirements.listPages.push({
        id,
        query,
        neededVariables: extraction.variables,
        contentSectionIndices: extraction.contentIndices,
        previewLengths: extraction.previewLengths,
        formFields: extraction.formFields,
        tagsLinkPrefix: extraction.tagsLinkPrefix,
        hiddenTagsLinkPrefix: extraction.hiddenTagsLinkPrefix,
        urlAttrPrefix,
        rawAttributes,
      });

      // Compile template
      compiledListPagesTemplates.set(id, compileTemplate(body));
    } else if (isListUsersModule(element.data)) {
      const listUsers = element.data;
      const id = listUsersIdCounter++;
      const body = listUsers.body ?? "";

      const neededVariables = extractListUsersVariables(body);

      requirements.listUsers.push({
        id,
        users: listUsers.users,
        neededVariables,
      });

      compiledListUsersTemplates.set(id, compileListUsersTemplate(body));
    }
  });

  return { requirements, compiledListPagesTemplates, compiledListUsersTemplates };
}

/**
 * Build a ListPagesQuery from the parsed module attributes.
 *
 * Maps module attribute names (which use kebab-case in the AST) to the
 * query's camelCase property names. Also extracts data form fields
 * (attributes prefixed with `_`) into a separate record.
 *
 * @param module - Parsed list-pages module data from the AST
 * @returns Query parameters ready for normalization and external fetching
 */
function buildQuery(module: ListPagesModuleData): ListPagesQuery {
  return {
    pagetype: module.pagetype as ListPagesQuery["pagetype"],
    category: module.category,
    tags: module.tags,
    parent: module.parent,
    linkTo: module["link-to"],
    createdAt: module["created-at"],
    updatedAt: module["updated-at"],
    createdBy: module["created-by"],
    rating: module.rating,
    votes: module.votes,
    name: module.name,
    fullname: module.fullname,
    range: module.range as ListPagesQuery["range"],
    order: module.order,
    offset: module.offset,
    limit: module.limit,
    perPage: module["per-page"],
    reverse: module.reverse,
    // dataFormFields is extracted from attributes prefixed with _
    dataFormFields: extractDataFormFields(module.attributes),
  };
}

/**
 * Extract data form field selectors from module attributes.
 *
 * Wikidot's ListPages supports filtering by data form fields using attribute
 * names prefixed with `_` (e.g., `_color="red"`). The prefix is stripped from
 * the key in the returned record.
 *
 * @param attributes - Raw module attributes
 * @returns Record of field name to value (without `_` prefix), or undefined if no fields found
 */
function extractDataFormFields(
  attributes: Record<string, string>,
): Record<string, string> | undefined {
  const fields: Record<string, string> = {};
  let hasFields = false;

  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith("_")) {
      fields[key.slice(1)] = value;
      hasFields = true;
    }
  }

  return hasFields ? fields : undefined;
}

/**
 * Internal result of analyzing a ListPages template string for variable usage.
 */
interface TemplateExtraction {
  variables: ListPagesVariable[];
  contentIndices: number[];
  previewLengths: number[];
  formFields: string[];
  tagsLinkPrefix?: string;
  hiddenTagsLinkPrefix?: string;
}

/**
 * Extract all variable references from a ListPages template string.
 *
 * Scans the template for `%%variable%%` patterns and categorizes them:
 * - Simple variables (e.g., `%%title%%`, `%%created_at%%`)
 * - Parameterized variables (e.g., `%%content{2}%%`, `%%form_data{color}%%`)
 * - Preview with length (e.g., `%%preview(100)%%`)
 * - Tags with prefix (e.g., `%%tags_linked|/tag/%%`)
 *
 * @param template - The template string to analyze
 * @returns Structured extraction result with categorized variable information
 */
function extractVariablesFromTemplate(template: string): TemplateExtraction {
  const variables = new Set<ListPagesVariable>();
  const contentIndices = new Set<number>();
  const previewLengths = new Set<number>();
  const formFields = new Set<string>();
  let tagsLinkPrefix: string | undefined;
  let hiddenTagsLinkPrefix: string | undefined;

  for (const match of template.matchAll(VARIABLE_REGEX)) {
    const [, name, braceParam, parenParam, format] = match;
    if (!name) continue;
    const varName = name.toLowerCase();

    // Handle parameterized variables
    if (braceParam !== undefined) {
      switch (varName) {
        case "content":
          contentIndices.add(Number(braceParam));
          variables.add("content_n");
          continue;
        case "form_data":
          formFields.add(braceParam);
          variables.add("form_data");
          continue;
        case "form_raw":
          formFields.add(braceParam);
          variables.add("form_raw");
          continue;
        case "form_label":
          formFields.add(braceParam);
          variables.add("form_label");
          continue;
        case "form_hint":
          formFields.add(braceParam);
          variables.add("form_hint");
          continue;
      }
    }

    if (parenParam !== undefined && varName === "preview") {
      previewLengths.add(Number(parenParam));
      variables.add("preview_n");
      continue;
    }

    // Handle tags_linked with prefix
    if (varName === "tags_linked") {
      if (format) tagsLinkPrefix = format;
      variables.add("tags_linked");
      continue;
    }
    if (varName === "_tags_linked") {
      if (format) hiddenTagsLinkPrefix = format;
      variables.add("_tags_linked");
      continue;
    }

    // Normalize and add variable
    const normalized = normalizeVariableName(varName);
    if (normalized) {
      variables.add(normalized);
    }
  }

  return {
    variables: Array.from(variables),
    contentIndices: Array.from(contentIndices).sort((a, b) => a - b),
    previewLengths: Array.from(previewLengths).sort((a, b) => a - b),
    formFields: Array.from(formFields).sort(),
    tagsLinkPrefix,
    hiddenTagsLinkPrefix,
  };
}

/**
 * Normalize a variable name to its canonical `ListPagesVariable` form.
 *
 * Only known variable names are accepted. Unknown names return null,
 * causing them to be silently ignored (matching Wikidot's behavior of
 * rendering unknown variables as empty strings).
 *
 * @param name - Lowercase variable name extracted from the template
 * @returns The canonical variable name, or null if not recognized
 */
function normalizeVariableName(name: string): ListPagesVariable | null {
  // Direct mapping for known variables
  const knownVariables: ListPagesVariable[] = [
    // Lifecycle
    "created_at",
    "created_by",
    "created_by_unix",
    "created_by_id",
    "created_by_linked",
    "updated_at",
    "updated_by",
    "updated_by_unix",
    "updated_by_id",
    "updated_by_linked",
    "commented_at",
    "commented_by",
    "commented_by_unix",
    "commented_by_id",
    "commented_by_linked",
    // Structure
    "name",
    "category",
    "fullname",
    "title",
    "title_linked",
    "link",
    "parent_name",
    "parent_category",
    "parent_fullname",
    "parent_title",
    "parent_title_linked",
    // Content
    "content",
    "preview",
    "summary",
    "first_paragraph",
    // Tags
    "tags",
    "_tags",
    // Metrics
    "children",
    "comments",
    "size",
    "rating",
    "rating_votes",
    "rating_percent",
    "revisions",
    // Pagination
    "index",
    "total",
    "limit",
    "total_or_limit",
    // Site
    "site_title",
    "site_name",
    "site_domain",
  ];

  if (knownVariables.includes(name as ListPagesVariable)) {
    return name as ListPagesVariable;
  }

  return null;
}
