// Re-export AST types and utilities from @wdprlib/ast
export type {
  Position,
  Point,
  Version,
  Element,
  SyntaxTree,
  ContainerType,
  ContainerData,
  AttributeMap,
  VariableMap,
  Alignment,
  LinkType,
  LinkLocation,
  LinkLabel,
  PageRef,
  ImageSource,
  FloatAlignment,
  ListType,
  ListItem,
  ListData,
  CodeBlockData,
  TabData,
  TableCell,
  TableRow,
  TableData,
  DefinitionListItem,
  Module,
  CollapsibleData,
  ClearFloat,
  AnchorTarget,
  HeaderType,
  AlignType,
  HeadingLevel,
  Heading,
  DateItem,
  Embed,
  TocEntry,
} from "@wdprlib/ast";
export {
  createPoint,
  createPosition,
  text,
  container,
  paragraph,
  bold,
  italics,
  heading,
  lineBreak,
  horizontalRule,
  link,
  list,
  listItemElements,
  listItemSubList,
} from "@wdprlib/ast";

// Wikitext settings (re-exported from @wdprlib/ast)
export type { WikitextMode, WikitextSettings } from "@wdprlib/ast";
export { createSettings, DEFAULT_SETTINGS } from "@wdprlib/ast";

// Lexer
export type { TokenType, Token, LexerOptions } from "./lexer";
export { Lexer, tokenize, createToken } from "./lexer";

// Parser
export type { ParserOptions } from "./parser";
export { Parser, parse } from "./parser";

// Modules (ListPages, ListUsers, IfTags, Include, etc.)
export type {
  // ListPages query types
  ListPagesQuery,
  ListPagesVariable,
  // Data requirement types
  ListPagesDataRequirement,
  DataRequirements,
  // External data types
  UserInfo,
  PageData,
  SiteContext,
  ListPagesExternalData,
  // Callback types
  ListPagesDataFetcher,
  DataProvider,
  // Template types
  VariableContext,
  CompiledTemplate,
  // Extraction types
  ExtractionResult,
  // Resolution types
  ParseFunction,
  ResolveOptions,
  // Include resolution
  IncludeFetcher,
  ResolveIncludesOptions,
  // ListUsers types
  ListUsersVariable,
  ListUsersUserData,
  ListUsersDataRequirement,
  ListUsersExternalData,
  ListUsersDataFetcher,
  ListUsersVariableContext,
  ListUsersCompiledTemplate,
  // Normalized query types
  NormalizedListPagesQuery,
  NormalizedTags,
  NormalizedCategory,
  NormalizedOrder,
  NormalizedParent,
  NormalizedDateSelector,
  NormalizedNumericSelector,
} from "./parser/rules/block/module/index";
export {
  extractDataRequirements,
  resolveModules,
  compileTemplate,
  // Include resolution
  resolveIncludes,
  // Query normalization (for advanced use cases)
  normalizeQuery,
  parseTags,
  parseCategory,
  parseOrder,
  parseParent,
  parseDateSelector,
  parseNumericSelector,
  // ListUsers
  extractListUsersVariables,
  compileListUsersTemplate,
  isListUsersModule,
  resolveListUsers,
} from "./parser/rules/block/module/index";
