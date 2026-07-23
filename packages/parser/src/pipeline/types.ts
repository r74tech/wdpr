import type {
  Diagnostic,
  PageRef,
  SyntaxTree,
  WikitextPageContext,
  WikitextSettings,
} from "@wdprlib/ast";
import type { IncludeDependency } from "../parser/rules/block/module/include";
import type {
  ListPagesDataRequirement,
  ListPagesExternalData,
  NormalizedListPagesQuery,
} from "../parser/rules/block/module/listpages/types";
import type {
  ListUsersDataRequirement,
  ListUsersExternalData,
} from "../parser/rules/block/module/listusers/types";
import type {
  TagCloudDataRequirement,
  TagCloudExternalData,
} from "../parser/rules/block/module/tagcloud/types";

export interface ProcessWikitextCallbackContext<TPage extends WikitextPageContext> {
  page: TPage;
  settings: WikitextSettings;
}

export interface ProcessWikitextDataProvider<TPage extends WikitextPageContext> {
  fetchInclude?: (
    pageRef: PageRef,
    context: ProcessWikitextCallbackContext<TPage>,
  ) => Promise<string | null>;
  fetchListPages?: (
    query: NormalizedListPagesQuery,
    requirement: ListPagesDataRequirement,
    context: ProcessWikitextCallbackContext<TPage>,
  ) => Promise<ListPagesExternalData | null | undefined>;
  fetchListUsers?: (
    requirement: ListUsersDataRequirement,
    context: ProcessWikitextCallbackContext<TPage>,
  ) => Promise<ListUsersExternalData | null | undefined>;
  fetchTagCloud?: (
    requirement: TagCloudDataRequirement,
    context: ProcessWikitextCallbackContext<TPage>,
  ) => Promise<TagCloudExternalData | null | undefined>;
}

export interface ProcessWikitextOptions<TPage extends WikitextPageContext> {
  page: TPage;
  settings?: WikitextSettings;
  dataProvider?: ProcessWikitextDataProvider<TPage>;
  includeMaxIterations?: number;
}

export interface ProcessedWikitextDocument<
  TPage extends WikitextPageContext = WikitextPageContext,
> {
  ast: SyntaxTree;
  page: TPage;
  settings: WikitextSettings;
  diagnostics: Diagnostic[];
  dependencies: IncludeDependency[];
}
