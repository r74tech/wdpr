import type {
  Diagnostic,
  PageRef,
  SyntaxTree,
  WikitextPageContext,
  WikitextSettings,
  RatingRef,
  RatingState,
  ReadableTextOptions,
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
  /**
   * Read only authorized, registered ratings in context.page, including declarations
   * from its includes. Keys match exactly. Omit no-rate and inaccessible references.
   * Main category policy and custom policies are independent. Votes belong to page + ref.
   * ListPages/ListUsers output cannot declare ratings, including its nested includes.
   * The host owns registration, aggregation and invalidation when included declarations change.
   */
  fetchRatings?: (
    refs: readonly RatingRef[],
    context: ProcessWikitextCallbackContext<TPage>,
  ) => Promise<readonly RatingState[]>;
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
  readableText?: ReadableTextOptions;
}

export interface ProcessedWikitextDocument<
  TPage extends WikitextPageContext = WikitextPageContext,
> {
  ast: SyntaxTree;
  readableText: string;
  /** First nonempty body paragraph, excluding headings and appended footnotes. */
  firstParagraph: string;
  characterCount: number;
  page: TPage;
  settings: WikitextSettings;
  diagnostics: Diagnostic[];
  dependencies: IncludeDependency[];
}
