/**
 * Element types for AST
 */

/**
 * Attributes map
 */
export type AttributeMap = Record<string, string>;

/**
 * Variable map for includes
 */
export type VariableMap = Record<string, string>;

/**
 * Alignment
 */
export type Alignment = "left" | "right" | "center" | "justify";

/**
 * Float alignment
 */
export interface FloatAlignment {
  align: Alignment;
  float: boolean;
}

/**
 * Heading level
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Heading structure
 */
export interface Heading {
  level: HeadingLevel;
  "has-toc": boolean;
}

/**
 * Header container type
 */
export interface HeaderType {
  header: Heading;
}

/**
 * Align container type
 */
export interface AlignType {
  align: Alignment;
}

/**
 * String-only container types (formatting, structural, etc.)
 */
export type StringContainerType =
  | "bold"
  | "italics"
  | "underline"
  | "superscript"
  | "subscript"
  | "strikethrough"
  | "monospace"
  | "span"
  | "div"
  | "blockquote"
  | "size"
  | "paragraph"
  | "heading"
  | "collapsible"
  | "definition-list"
  | "definition-list-item"
  | "definition-list-key"
  | "definition-list-value"
  | "table-row"
  | "table-cell";

/**
 * Container types
 */
export type ContainerType = StringContainerType | HeaderType | AlignType;

/**
 * Type guard: ContainerType is a string literal
 */
export function isStringContainerType(type: ContainerType): type is StringContainerType {
  return typeof type === "string";
}

/**
 * Type guard: ContainerType is a HeaderType
 */
export function isHeaderType(type: ContainerType): type is HeaderType {
  return typeof type === "object" && type !== null && "header" in type;
}

/**
 * Type guard: ContainerType is an AlignType
 */
export function isAlignType(type: ContainerType): type is AlignType {
  return typeof type === "object" && type !== null && "align" in type;
}

/**
 * Container data
 */
export interface ContainerData {
  type: ContainerType;
  attributes: AttributeMap;
  elements: Element[];
  // Internal parsing flags (used during parsing, removed in output)
  _paragraphStrip?: boolean;
  _emptyParagraphStrip?: boolean;
  _escapedFromParagraph?: boolean;
  _closeSpan?: boolean;
  _splitByBlankLine?: boolean;
}

/**
 * Anchor target
 */
export type AnchorTarget = "new-tab" | "parent" | "top" | "same";

/**
 * Page reference (for internal links)
 */
export interface PageRef {
  site: string | null;
  page: string;
}

/**
 * Link location - either a page reference or a URL string
 */
export type LinkLocation = PageRef | string;

/**
 * Link label types
 */
export type LinkLabel = { text: string } | { url: string | null } | "page";

/**
 * Link type
 */
export type LinkType = "direct" | "page" | "interwiki" | "anchor" | "table-of-contents";

/**
 * Image source
 */
export type ImageSource =
  | { type: "url"; data: string }
  | { type: "file1"; data: { file: string } }
  | { type: "file2"; data: { page: string; file: string } }
  | { type: "file3"; data: { site: string; page: string; file: string } };

/**
 * List type
 */
export type ListType = "bullet" | "numbered" | "generic";

/**
 * List item - discriminated union
 */
export type ListItem =
  | {
      "item-type": "elements";
      attributes: AttributeMap;
      elements: Element[];
    }
  | {
      "item-type": "sub-list";
      element: "list";
      data: ListData;
    };

/**
 * List data
 */
export interface ListData {
  type: ListType;
  attributes: AttributeMap;
  items: ListItem[];
}

/**
 * Definition list item
 */
export interface DefinitionListItem {
  key_string: string;
  key: Element[];
  value: Element[];
}

/**
 * Table cell
 */
export interface TableCell {
  header: boolean;
  "column-span": number;
  align: Alignment | null;
  attributes: AttributeMap;
  elements: Element[];
}

/**
 * Table row
 */
export interface TableRow {
  attributes: AttributeMap;
  cells: TableCell[];
}

/**
 * Table data
 */
export interface TableData {
  attributes: AttributeMap;
  rows: TableRow[];
}

/**
 * Tab data
 */
export interface TabData {
  label: string;
  elements: Element[];
}

/**
 * Code block data
 */
export interface CodeBlockData {
  contents: string;
  language: string | null;
  name: string | null;
}

/**
 * Collapsible data
 */
export interface CollapsibleData {
  elements: Element[];
  attributes: AttributeMap;
  "start-open": boolean;
  "show-text": string | null;
  "hide-text": string | null;
  "show-top": boolean;
  "show-bottom": boolean;
}

/**
 * Module types
 */
export type Module =
  | {
      module: "unknown";
      name: string;
      arguments: AttributeMap;
      body?: string;
    }
  | {
      module: "backlinks";
      page: string | null;
    }
  | {
      module: "categories";
      "include-hidden": boolean;
    }
  | {
      module: "join";
      "button-text": string | null;
      attributes: AttributeMap;
    }
  | {
      module: "page-tree";
      root: string | null;
      "show-root": boolean;
      depth: number | null;
    }
  | {
      module: "rate";
    }
  | {
      module: "list-users";
      users: string;
      body?: string;
      attributes: AttributeMap;
    }
  | {
      module: "list-pages";
      // Selection criteria
      category?: string;
      tags?: string;
      parent?: string;
      "link-to"?: string;
      "created-by"?: string;
      "created-at"?: string;
      "updated-at"?: string;
      rating?: string;
      votes?: string;
      name?: string;
      fullname?: string;
      range?: string;
      pagetype?: string;
      // Numeric selectors
      offset?: number;
      limit?: number;
      "per-page"?: number;
      // Ordering
      order?: string;
      // Display options
      reverse: boolean;
      separate: boolean;
      wrapper: boolean;
      "prepend-line"?: string;
      "append-line"?: string;
      // RSS options
      rss?: string;
      "rss-description"?: string;
      "rss-home"?: string;
      "rss-limit"?: number;
      "rss-only": boolean;
      // Advanced options
      "url-attr-prefix"?: string;
      // Body template
      body?: string;
      // Additional attributes
      attributes: AttributeMap;
    };

/**
 * Embed types
 */
export type Embed =
  | { embed: "youtube"; data: { "video-id": string } }
  | { embed: "vimeo"; data: { "video-id": string } }
  | { embed: "github-gist"; data: { username: string; hash: string } }
  | { embed: "gitlab-snippet"; data: { "snippet-id": string } };

/**
 * Date item value
 */
export interface DateItem {
  timestamp: number;
  timezone: string;
}

/**
 * Clear float direction
 */
export type ClearFloat = "left" | "right" | "both";

// --- Named data types for Element variants ---

export interface AnchorData {
  target: AnchorTarget | null;
  attributes: AttributeMap;
  elements: Element[];
}

export interface LinkData {
  type: LinkType;
  link: LinkLocation;
  extra: string | null;
  label: LinkLabel;
  target: AnchorTarget | null;
}

export interface ImageData {
  source: ImageSource;
  link: LinkLocation | null;
  alignment: FloatAlignment | null;
  attributes: AttributeMap;
}

export interface TableOfContentsData {
  attributes: AttributeMap;
  align: Alignment | null;
}

export interface FootnoteBlockData {
  title: string | null;
  hide?: boolean;
}

export interface BibliographyCiteData {
  label: string;
  brackets: boolean;
}

export interface BibliographyBlockData {
  index: number;
  title: string | null;
  hide: boolean;
}

export interface UserData {
  name: string;
  "show-avatar": boolean;
}

export interface DateData {
  value: DateItem;
  format: string | null;
  hover: boolean;
}

export interface ColorData {
  color: string;
  elements: Element[];
}

export interface MathData {
  name: string | null;
  "latex-source": string;
}

export interface MathInlineData {
  "latex-source": string;
}

export interface HtmlData {
  contents: string;
}

export interface IframeData {
  url: string;
  attributes: AttributeMap;
}

export interface IncludeData {
  "paragraph-safe": boolean;
  variables: VariableMap;
  location: PageRef;
  elements: Element[];
}

export interface IfTagsData {
  condition: string;
  elements: Element[];
}

/**
 * Expression data: [[#expr expression]]
 * The expression is stored as a string and evaluated at render time.
 */
export interface ExprData {
  expression: string;
}

/**
 * If data: [[#if value | then | else]]
 * Simple true/false checker that treats the value as a string.
 * False values: "false", "null", "", "0"
 */
export interface IfCondData {
  condition: string;
  then: Element[];
  else: Element[];
}

/**
 * IfExpr data: [[#ifexpr expression | then | else]]
 * Evaluates the expression and branches based on the result.
 */
export interface IfExprData {
  expression: string;
  then: Element[];
  else: Element[];
}

// --- ElementDataMap: maps element tag to its data type ---
// void means the element has no data property.
// Using `type` instead of `interface` to prevent declaration merging.

export type ElementDataMap = {
  container: ContainerData;
  module: Module;
  text: string;
  raw: string;
  variable: string;
  email: string;
  table: TableData;
  "tab-view": TabData[];
  anchor: AnchorData;
  "anchor-name": string;
  link: LinkData;
  image: ImageData;
  list: ListData;
  "definition-list": DefinitionListItem[];
  collapsible: CollapsibleData;
  "table-of-contents": TableOfContentsData;
  footnote: void;
  "footnote-ref": number;
  "footnote-block": FootnoteBlockData;
  "bibliography-cite": BibliographyCiteData;
  "bibliography-block": BibliographyBlockData;
  user: UserData;
  date: DateData;
  color: ColorData;
  code: CodeBlockData;
  math: MathData;
  "math-inline": MathInlineData;
  "equation-reference": string;
  embed: Embed;
  html: HtmlData;
  iframe: IframeData;
  include: IncludeData;
  style: string;
  "line-break": void;
  "line-breaks": number;
  "clear-float": ClearFloat;
  "horizontal-rule": void;
  "content-separator": void;
  "if-tags": IfTagsData;
  expr: ExprData;
  if: IfCondData;
  ifexpr: IfExprData;
};

/**
 * All element tag names
 */
export type ElementName = keyof ElementDataMap;

/**
 * Get the data type for a given element name
 */
export type ElementData<K extends ElementName> = ElementDataMap[K];

/**
 * Get the Element variant for a given element name
 */
export type ElementOf<K extends ElementName> = ElementDataMap[K] extends void
  ? { element: K }
  : { element: K; data: ElementDataMap[K] };

/**
 * Element - tagged union generated from ElementDataMap
 */
export type Element = {
  [K in ElementName]: ElementOf<K>;
}[ElementName];

/**
 * TOC entry collected during parsing (internal format)
 */
export interface TocEntry {
  level: number;
  text: string;
}

/**
 * Syntax tree - root of the AST
 */
export interface SyntaxTree {
  elements: Element[];
  "table-of-contents"?: Element[];
  styles?: string[];
  "html-blocks"?: string[];
  "code-blocks"?: CodeBlockData[];
  footnotes?: Element[][];
}

/**
 * Create a text element
 */
export function text(value: string): Element {
  return { element: "text", data: value };
}

/**
 * Create a container element
 */
export function container(
  type: ContainerType,
  elements: Element[],
  attributes: AttributeMap = {},
): Element {
  return {
    element: "container",
    data: { type, attributes, elements },
  };
}

/**
 * Create a paragraph element
 */
export function paragraph(elements: Element[], attributes: AttributeMap = {}): Element {
  return container("paragraph", elements, attributes);
}

/**
 * Create a bold element
 */
export function bold(elements: Element[], attributes: AttributeMap = {}): Element {
  return container("bold", elements, attributes);
}

/**
 * Create an italics element
 */
export function italics(elements: Element[], attributes: AttributeMap = {}): Element {
  return container("italics", elements, attributes);
}

/**
 * Create a heading element
 */
export function heading(
  level: HeadingLevel,
  elements: Element[],
  hasToc = true,
  attributes: AttributeMap = {},
): Element {
  return container({ header: { level, "has-toc": hasToc } }, elements, attributes);
}

/**
 * Create a line break element
 */
export function lineBreak(): Element {
  return { element: "line-break" };
}

/**
 * Create a horizontal rule element
 */
export function horizontalRule(): Element {
  return { element: "horizontal-rule" };
}

/**
 * Create a link element
 */
export function link(
  linkLocation: LinkLocation,
  label: LinkLabel,
  options: {
    type?: LinkType;
    extra?: string | null;
    target?: AnchorTarget | null;
  } = {},
): Element {
  return {
    element: "link",
    data: {
      type: options.type ?? (typeof linkLocation === "string" ? "direct" : "page"),
      link: linkLocation,
      extra: options.extra ?? null,
      label,
      target: options.target ?? null,
    },
  };
}

/**
 * Create a list element
 */
export function list(type: ListType, items: ListItem[], attributes: AttributeMap = {}): Element {
  return {
    element: "list",
    data: { type, attributes, items },
  };
}

/**
 * Create a list item (elements type)
 */
export function listItemElements(elements: Element[], attributes: AttributeMap = {}): ListItem {
  return {
    "item-type": "elements",
    attributes,
    elements,
  };
}

/**
 * Create a list item (sub-list type)
 */
export function listItemSubList(data: ListData): ListItem {
  return {
    "item-type": "sub-list",
    element: "list",
    data,
  };
}

/**
 * Check if a container type is paragraph-safe.
 */
export function isContainerTypeParagraphSafe(type: ContainerType): boolean {
  if (isHeaderType(type)) return false;
  if (isAlignType(type)) return false;
  // String container types
  switch (type) {
    case "bold":
    case "italics":
    case "underline":
    case "superscript":
    case "subscript":
    case "strikethrough":
    case "monospace":
    case "span":
    case "size":
      return true;
    case "div":
    case "blockquote":
    case "paragraph":
    case "heading":
    case "collapsible":
    case "definition-list":
    case "definition-list-item":
    case "definition-list-key":
    case "definition-list-value":
    case "table-row":
    case "table-cell":
      return false;
    default:
      // Unknown types are treated as not paragraph-safe for safety
      return false;
  }
}

/**
 * Check if an element is paragraph-safe (can be contained within a paragraph).
 *
 * This does a surface-level check and does not look into element interiors.
 */
export function isParagraphSafe(element: Element): boolean {
  switch (element.element) {
    case "container": {
      const data = element.data as ContainerData;
      return isContainerTypeParagraphSafe(data.type);
    }
    case "module":
      return false;
    case "text":
    case "raw":
    case "variable":
    case "email":
      return true;
    case "table":
      return false;
    case "tab-view":
      return false;
    case "anchor":
    case "anchor-name":
    case "link":
      return true;
    case "image":
      return true;
    case "list":
      return false;
    case "definition-list":
      return false;
    case "collapsible":
      return false;
    case "table-of-contents":
      return false;
    case "footnote":
      return true;
    case "footnote-ref":
      return true;
    case "footnote-block":
      return false;
    case "bibliography-cite":
      return true;
    case "bibliography-block":
      return false;
    case "user":
      return true;
    case "date":
      return true;
    case "color":
      return true;
    case "code":
      return false;
    case "math":
      return false;
    case "math-inline":
      return true;
    case "embed":
      return false;
    case "html":
    case "iframe":
      return false;
    case "include": {
      const data = element.data as IncludeData;
      return data["paragraph-safe"];
    }
    case "style":
      return false;
    case "line-break":
    case "line-breaks":
      return true;
    case "clear-float":
      return false;
    case "horizontal-rule":
      return false;
    case "content-separator":
      return false;
    case "if-tags":
      return false;
    case "expr":
    case "if":
    case "ifexpr":
      return true;
    default:
      return false;
  }
}
