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
  TableOfContentsData,
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

// Wikitext settings
export type { WikitextMode, WikitextSettings } from "./settings";
export { createSettings, DEFAULT_SETTINGS } from "./settings";
