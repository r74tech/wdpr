/**
 * Extract data requirements from AST
 *
 * Analyzes the AST to find ListPages modules and determine
 * what external data they need.
 */

import type { SyntaxTree, Module } from "@wdpr/ast";
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
 * Type guard for list-pages module
 */
function isListPagesModule(module: Module): module is Extract<Module, { module: "list-pages" }> {
  return module.module === "list-pages";
}

// Variable pattern for extraction
const VARIABLE_REGEX = /%%([a-z_]+)(?:\{([^}]+)\})?(?:\((\d+)\))?(?:\|([^%]+))?%%/gi;

// Wikidot default template used when body is not specified
const DEFAULT_BODY_TEMPLATE = `+ %%title_linked%%

by %%created_by_linked%% %%created_at%%

%%summary%%`;

/**
 * Result of extraction including compiled templates
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
 * ListPages module data extracted from Module type
 */
type ListPagesModuleData = Extract<Module, { module: "list-pages" }>;

/**
 * Type guard for list-users module
 */
function isListUsersModule(module: Module): module is Extract<Module, { module: "list-users" }> {
  return module.module === "list-users";
}

/**
 * Extract data requirements from a parsed AST
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
 * Build query parameters from list-pages module
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
 * Extract data form fields from attributes (keys starting with _)
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
 * Extraction result from template
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
 * Extract all variable information from template
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
 * Normalize variable name to canonical form
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
