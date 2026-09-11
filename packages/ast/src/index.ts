/**
 * AST type definitions for the Wikidot markup parser.
 *
 * This package provides the TypeScript types that describe the abstract
 * syntax tree (AST) produced by `@wdprlib/parser` and consumed by
 * `@wdprlib/render`. It also exports factory helpers for constructing
 * common node types and context-dependent settings for controlling
 * parser/renderer behaviour.
 *
 * @packageDocumentation
 */

export { buildInfo } from "./build-info.generated";

export type { Position, Point } from "./position";
export { createPoint, createPosition } from "./position";

/**
 * Identifies the source markup dialect.
 *
 * Currently only `"wikidot"` is supported. Included in {@link SyntaxTree}
 * so consumers can branch on the dialect if other formats are added later.
 *
 * @group Core
 */
export type Version = "wikidot";

// Element types (output AST)
export type {
  Element,
  ElementName,
  ElementData,
  ElementOf,
  ElementDataMap,
  SyntaxTree,
  ContainerType,
  StringContainerType,
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
  EmbedBlockData,
  TocEntry,
  AnchorData,
  LinkData,
  ImageData,
  GallerySize,
  GalleryOrder,
  GalleryItem,
  GalleryContent,
  GalleryData,
  TableOfContentsData,
  PagerData,
  FootnoteBlockData,
  BibliographyCiteData,
  BibliographyBlockData,
  UserData,
  DateData,
  ColorData,
  MathData,
  MathInlineData,
  HtmlData,
  IframeData,
  IncludeData,
  IfTagsData,
  ExprData,
  IfCondData,
  IfExprData,
} from "./element";
export {
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
  isStringContainerType,
  isHeaderType,
  isAlignType,
  isContainerTypeParagraphSafe,
  isParagraphSafe,
} from "./element";

// Diagnostics
export type { Diagnostic, DiagnosticSeverity, ParseResult } from "./diagnostic";

// Constants
export { STYLE_ANCHOR_PREFIX, STYLE_SLOT_PREFIX } from "./constants";

// CSS value definitions
export type { CssLengthUnit } from "./css";
export { CSS_LENGTH_UNITS } from "./css";

// Wikitext settings
export type { WikitextMode, WikitextSettings } from "./settings";

// Expression evaluator (shared by parser preprocess and render).
export { evaluateExpression, isTruthy, formatExprValue } from "./expr-eval";
export type { ExprResult } from "./expr-eval";
export { createSettings, DEFAULT_SETTINGS } from "./settings";

// Shared high-level pipeline page context
export type { WikitextPageContext, WikitextPageFile } from "./page-context";
